// Declaramos las variables fuera para que sean accesibles en todo el script
const form = document.getElementById('reclamacionForm');
const submitButton = form.querySelector('.btn-enviar');
let formFields; // Corregido el ámbito

document.addEventListener('DOMContentLoaded', () => {
    formFields = form.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], textarea');

    const saveData = () => formFields.forEach(field => localStorage.setItem(field.id, field.value));
    const loadData = () => {
        formFields.forEach(field => {
            const savedValue = localStorage.getItem(field.id);
            if (savedValue) field.value = savedValue;
        });
    };

    formFields.forEach(field => field.addEventListener('input', saveData));
    loadData();

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', (event) => {
            const successMessage = event.target.closest('.input-ejemplo').querySelector('.upload-success-message');
            successMessage.style.display = event.target.files.length > 0 ? 'inline' : 'none';
        });
    });
});

form.addEventListener('submit', async function(event) {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Generando PDF...';

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        if (typeof value === 'string') data[key] = value;
    });

    try {
        const images = await getImagesAsBase64();
        const pdfBlob = await generatePdfBlob(data, images);

        // Convertir el Blob del PDF a una cadena Base64 para guardarlo
        const pdfBase64 = await blobToBase64(pdfBlob);
        sessionStorage.setItem('pdfData', pdfBase64);

        // Preparar parámetros para el correo y redirigir
        const subject = `Nueva Reclamación de: ${data.empresa} - Factura: ${data.factura || 'N/A'}`;
        const body = `Hola,\n\nHas recibido una nueva reclamación de la empresa: ${data.empresa}.\nPersona de contacto: ${data.contacto}.\n\nTodos los detalles y las imágenes están en el archivo PDF adjunto.\n\nSaludos.`;
        
        window.location.href = `confirmacion.html?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        formFields.forEach(field => localStorage.removeItem(field.id));
    } catch (error) {
        alert(error.message || 'Hubo un problema al generar el PDF.');
        resetButtonState();
    }
});

function getImagesAsBase64() {
    const fileInputs = [
        document.getElementById('fotoDelantera'),
        document.getElementById('fotoTrasera'),
        document.getElementById('fotoDetalleDefecto'),
        document.getElementById('fotoEtiqueta')
    ];

    const filePromises = fileInputs.map(input => {
        return new Promise((resolve, reject) => {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(input.files[0]);
            } else {
                reject(new Error(`La imagen "${input.labels[0].textContent}" es obligatoria.`));
            }
        });
    });

    return Promise.all(filePromises).then(([delantera, trasera, detalle, etiqueta]) => {
        return { delantera, trasera, detalle, etiqueta };
    });
}

async function generatePdfBlob(data, images) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Aquí va toda la lógica de creación del PDF que ya teníamos
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    try {
        const upowerLogoBase64 = await imageToBase64('img/upower.png');
        doc.addImage(upowerLogoBase64, 'PNG', margin, 5, 25, 10);
    } catch (logoError) {
        console.warn('Logo de U-Power no encontrado:', logoError);
    }

    doc.setFontSize(14).setFont('Helvetica', 'bold').setTextColor(255, 0, 0);
    doc.text('RECLAMACION DE GARANTÍAS', pageWidth / 2, 10, { align: 'center' });
    doc.setDrawColor(0, 0, 0).setLineWidth(0.5);
    doc.line(margin, 15, pageWidth - margin, 15);

    let y = 20;
    const fieldHeight = 8, labelWidth = 30, dataWidth = 60;
    const col1X = margin, col2X = margin + labelWidth + dataWidth + 10;

    const drawField = (label, value, x, yPos) => {
        doc.setFontSize(9).setFont('Helvetica', 'bold').setFillColor(230, 230, 230);
        doc.rect(x, yPos, labelWidth, fieldHeight, 'FD');
        doc.setTextColor(0, 0, 0).text(label, x + 2, yPos + 5);
        doc.rect(x + labelWidth, yPos, dataWidth, fieldHeight, 'S');
        doc.setFont('Helvetica', 'normal').text(value || '', x + labelWidth + 2, yPos + 5);
    };

    drawField('FECHA', data.fecha, col1X, y);
    drawField('AGENTE', 'Representaciones Arroyo', col2X, y); y += fieldHeight;
    drawField('CLIENTE', data.empresa, col1X, y);
    drawField('CONTACTO', data.contacto, col2X, y); y += fieldHeight;
    drawField('MODELO', data.modelo, col1X, y); y += fieldHeight;
    drawField('REF', data.referencia, col1X, y); y += fieldHeight;
    drawField('TALLA', data.talla, col1X, y); y += fieldHeight + 5;

    doc.setFontSize(9).setFont('Helvetica', 'bold').text('DESCRIPCIÓN DEFECTO', col1X, y); y += 3;
    const descHeight = 30;
    doc.rect(col1X, y, contentWidth, descHeight, 'S');
    const splitDescription = doc.splitTextToSize(data.defecto, contentWidth - 4);
    doc.setFont('Helvetica', 'normal').text(splitDescription, col1X + 2, y + 5);
    y += descHeight + 5;

    const photoAreaHeight = doc.internal.pageSize.getHeight() - y - margin;
    doc.setFillColor(245, 245, 245).rect(margin, y, contentWidth, photoAreaHeight, 'F');
    const photoMargin = 5;
    const photoGridWidth = (contentWidth - photoMargin) / 2;
    const photoGridHeight = (photoAreaHeight - photoMargin) / 2;

    if (images.delantera) doc.addImage(images.delantera, 'JPEG', col1X, y, photoGridWidth, photoGridHeight);
    if (images.trasera) doc.addImage(images.trasera, 'JPEG', col1X + photoGridWidth + photoMargin, y, photoGridWidth, photoGridHeight);
    if (images.detalle) doc.addImage(images.detalle, 'JPEG', col1X, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);
    if (images.etiqueta) doc.addImage(images.etiqueta, 'JPEG', col1X + photoGridWidth + photoMargin, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);

    return doc.output('blob');
}

// Funciones auxiliares
function imageToBase64(url) {
    return fetch(url).then(res => res.blob()).then(blob => blobToBase64(blob));
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function resetButtonState() {
    submitButton.disabled = false;
    submitButton.textContent = 'Generar Reclamación';
}