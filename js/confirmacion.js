document.addEventListener('DOMContentLoaded', () => {
    const viewPdfButton = document.getElementById('viewPdfButton');
    const mailtoLinkElement = document.getElementById('mailtoLink');
    const pdfErrorElement = document.getElementById('pdfError');
    
    // 1. Recuperamos los datos "en crudo"
    const jsonData = sessionStorage.getItem('reclamacionData');
    
    if (jsonData) {
        // Si los datos existen, mostramos el botón
        viewPdfButton.style.display = 'inline-block';
        
        viewPdfButton.addEventListener('click', async (event) => {
            event.preventDefault();
            viewPdfButton.textContent = "Generando...";
            viewPdfButton.disabled = true;

            try {
                const payload = JSON.parse(jsonData);
                
                // 2. Generamos el PDF AHORA, como resultado del clic
                const pdfBlob = await createPdfBlob(payload.data, payload.images);
                const blobUrl = URL.createObjectURL(pdfBlob);
                
                // 3. Abrimos la nueva pestaña. ¡Esto es permitido por iOS!
                window.open(blobUrl, '_blank');
                
                // Limpiamos los datos para no volver a usarlos
                sessionStorage.removeItem('reclamacionData');
                viewPdfButton.textContent = "PDF Abierto";

            } catch (e) {
                alert("No se pudo generar el PDF. Por favor, inténtalo de nuevo.");
                viewPdfButton.textContent = "Ver y Guardar PDF";
                viewPdfButton.disabled = false;
            }
        });
    } else {
        viewPdfButton.style.display = 'none';
        pdfErrorElement.style.display = 'block';
    }

    // Lógica del mailto (sin cambios)
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const body = params.get('body');

    if (subject && body) {
        const recipient = 'nacho@representacionesarroyo.com';
        mailtoLinkElement.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    } else {
        mailtoLinkElement.href = 'mailto:nacho@representacionesarroyo.com';
    }
});

// COPIAMOS LA LÓGICA DE CREACIÓN DEL PDF AQUÍ TAMBIÉN
// Esto es necesario para que la página de confirmación pueda generar el PDF por sí misma.
async function createPdfBlob(data, images) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    try { const upowerLogoBase64 = await imageToBase64('img/upower.png'); doc.addImage(upowerLogoBase64, 'PNG', margin, 5, 25, 10); } catch (logoError) { console.warn('Logo de U-Power no encontrado.'); }
    doc.setFontSize(14); doc.setFont('Helvetica', 'bold'); doc.setTextColor(255, 0, 0); doc.text('RECLAMACION DE GARANTÍAS', pageWidth / 2, 10, { align: 'center' });
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.line(margin, 15, pageWidth - margin, 15);
    let y = 20; const fieldHeight = 8; const labelWidth = 30; const dataWidth = 60; const col1X = margin; const col2X = margin + labelWidth + dataWidth + 10;
    const drawField = (label, value, x, yPos) => { doc.setFontSize(9); doc.setFont('Helvetica', 'bold'); doc.setFillColor(230, 230, 230); doc.rect(x, yPos, labelWidth, fieldHeight, 'FD'); doc.setTextColor(0, 0, 0); doc.text(label, x + 2, yPos + 5); doc.rect(x + labelWidth, yPos, dataWidth, fieldHeight, 'S'); doc.setFont('Helvetica', 'normal'); doc.text(value || '', x + labelWidth + 2, yPos + 5); };
    drawField('FECHA', data.fecha, col1X, y); drawField('AGENTE', 'Representaciones Arroyo', col2X, y); y += fieldHeight;
    drawField('CLIENTE', data.empresa, col1X, y); drawField('CONTACTO', data.contacto, col2X, y); y += fieldHeight;
    drawField('MODELO', data.modelo, col1X, y); y += fieldHeight;
    drawField('REF', data.referencia, col1X, y); y += fieldHeight;
    drawField('TALLA', data.talla, col1X, y); y += fieldHeight + 5;
    doc.setFontSize(9); doc.setFont('Helvetica', 'bold'); doc.text('DESCRIPCIÓN DEFECTO', col1X, y); y += 3;
    const descHeight = 30; doc.rect(col1X, y, contentWidth, descHeight, 'S'); doc.setFont('Helvetica', 'normal'); const splitDescription = doc.splitTextToSize(data.defecto, contentWidth - 4); doc.text(splitDescription, col1X + 2, y + 5); y += descHeight + 5;
    const photoAreaHeight = doc.internal.pageSize.getHeight() - y - margin;
    doc.setFillColor(245, 245, 245); doc.rect(margin, y, contentWidth, photoAreaHeight, 'F');
    const photoMargin = 5; const photoGridWidth = (contentWidth - photoMargin) / 2; const photoGridHeight = (photoAreaHeight - photoMargin) / 2;
    if (images.delantera) doc.addImage(images.delantera, 'JPEG', col1X, y, photoGridWidth, photoGridHeight);
    if (images.trasera) doc.addImage(images.trasera, 'JPEG', col1X + photoGridWidth + photoMargin, y, photoGridWidth, photoGridHeight);
    if (images.detalle) doc.addImage(images.detalle, 'JPEG', col1X, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);
    if (images.etiqueta) doc.addImage(images.etiqueta, 'JPEG', col1X + photoGridWidth + photoMargin, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);

    return doc.output('blob');
}

function imageToBase64(url) {
    return fetch(url).then(response => { if (!response.ok) { throw new Error(`Error de red: ${response.statusText}`); } return response.blob(); }).then(blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }));
}