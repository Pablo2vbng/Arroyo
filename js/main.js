document.addEventListener('DOMContentLoaded', () => {
    // Lógica para Android (persistencia de datos)
    const form = document.getElementById('reclamacionForm');
    const formFields = form.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], textarea');
    const saveData = () => { formFields.forEach(field => localStorage.setItem(field.id, field.value)); };
    const loadData = () => { formFields.forEach(field => { const savedValue = localStorage.getItem(field.id); if (savedValue) { field.value = savedValue; } }); };
    formFields.forEach(field => field.addEventListener('input', saveData));
    loadData();

    // Mensaje de subida de imagen
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', (event) => {
            const parentContainer = event.target.closest('.input-ejemplo');
            const successMessage = parentContainer.querySelector('.upload-success-message');
            if (event.target.files.length > 0) { successMessage.style.display = 'inline'; } else { successMessage.style.display = 'none'; }
        });
    });

    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            // Limpiar localStorage y recargar la página
            formFields.forEach(field => { localStorage.removeItem(field.id); });
            window.location.reload();
        });
    }
});

const form = document.getElementById('reclamacionForm');
const submitButton = form.querySelector('.btn-enviar');

form.addEventListener('submit', function(event) {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Generando PDF... Por favor espera';

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        if (typeof value === 'string') {
            data[key] = value;
        }
    });
    
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
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(input.files[0]);
            } else {
                reject(new Error(`Por favor, adjunta la imagen para: ${input.labels[0].textContent}`));
            }
        });
    });

    Promise.all(filePromises)
        .then(imagesBase64 => {
            const [delantera, trasera, detalle, etiqueta] = imagesBase64;
            generatePdfAndShowConfirmation(data, { delantera, trasera, detalle, etiqueta });
        })
        .catch(error => {
            alert(error.message || 'Hubo un problema al cargar las imágenes.');
            resetButtonState();
        });
});

async function generatePdfAndShowConfirmation(data, images) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    try {
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);

        // Intenta cargar el logo de U-Power
        let upowerLogoBase64 = null;
        try {
            upowerLogoBase64 = await imageToBase64('img/upower.png');
            doc.addImage(upowerLogoBase64, 'PNG', margin, 5, 25, 10);
        } catch (logoError) {
            console.warn('Logo de U-Power no encontrado o no se pudo cargar.');
        }

        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(255, 0, 0);
        doc.text('RECLAMACION DE GARANTÍAS', pageWidth / 2, 10, { align: 'center' });
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(margin, 15, pageWidth - margin, 15);

        let y = 20;
        const fieldHeight = 8;
        const labelWidth = 30;
        const dataWidth = 60;
        const col1X = margin;
        const col2X = margin + labelWidth + dataWidth + 10;

        const drawField = (label, value, x, yPos) => {
            doc.setFontSize(9);
            doc.setFont('Helvetica', 'bold');
            doc.setFillColor(230, 230, 230);
            doc.rect(x, yPos, labelWidth, fieldHeight, 'FD');
            doc.setTextColor(0, 0, 0);
            doc.text(label, x + 2, yPos + 5);
            doc.rect(x + labelWidth, yPos, dataWidth, fieldHeight, 'S');
            doc.setFont('Helvetica', 'normal');
            doc.text(value || '', x + labelWidth + 2, yPos + 5);
        };

        drawField('FECHA', data.fecha, col1X, y);
        drawField('AGENTE', 'Representaciones Arroyo', col2X, y);
        y += fieldHeight;
        drawField('CLIENTE', data.empresa, col1X, y);
        drawField('CONTACTO', data.contacto, col2X, y);
        y += fieldHeight;
        drawField('MODELO', data.modelo, col1X, y);
        y += fieldHeight;
        drawField('REF', data.referencia, col1X, y);
        y += fieldHeight;
        drawField('TALLA', data.talla, col1X, y);
        y += fieldHeight + 5;

        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        doc.text('DESCRIPCIÓN DEFECTO', col1X, y);
        y += 3;
        const descHeight = 30;
        doc.rect(col1X, y, contentWidth, descHeight, 'S');
        doc.setFont('Helvetica', 'normal');
        const splitDescription = doc.splitTextToSize(data.defecto, contentWidth - 4);
        doc.text(splitDescription, col1X + 2, y + 5);
        y += descHeight + 5;

        const photoAreaHeight = doc.internal.pageSize.getHeight() - y - margin;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, contentWidth, photoAreaHeight, 'F');
        const photoMargin = 5;
        const photoGridWidth = (contentWidth - photoMargin) / 2;
        const photoGridHeight = (photoAreaHeight - photoMargin) / 2;

        if (images.delantera) doc.addImage(images.delantera, 'JPEG', col1X, y, photoGridWidth, photoGridHeight);
        if (images.trasera) doc.addImage(images.trasera, 'JPEG', col1X + photoGridWidth + photoMargin, y, photoGridWidth, photoGridHeight);
        if (images.detalle) doc.addImage(images.detalle, 'JPEG', col1X, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);
        if (images.etiqueta) doc.addImage(images.etiqueta, 'JPEG', col1X + photoGridWidth + photoMargin, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);

        // Generamos el blob y la URL
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);

        // ABRIMOS EL PDF EN UNA NUEVA PESTAÑA. Esto funciona bien en iOS.
        window.open(blobUrl, '_blank');

        // Configuramos el mailto
        const subject = `Nueva Reclamación de: ${data.empresa} - Factura: ${data.factura || 'N/A'}`;
        const body = `Hola,\n\nHas recibido una nueva reclamación de la empresa: ${data.empresa}.\nPersona de contacto: ${data.contacto}.\n\nTodos los detalles y las imágenes están en el archivo PDF adjunto.\n\nSaludos.`;
        const mailtoLink = document.getElementById('mailtoLink');
        if (mailtoLink) {
            mailtoLink.href = `mailto:nacho@representacionesarroyo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }

        // Mostramos la confirmación y ocultamos el formulario
        const formContainer = document.getElementById('formContainer');
        const confirmationMessage = document.getElementById('confirmationMessage'); // Cambiado de confirmationSection a confirmationMessage
        
        if (formContainer && confirmationMessage) {
            formContainer.style.display = 'none';
            confirmationMessage.style.display = 'block';
        } else {
            console.error("Elementos 'formContainer' o 'confirmationMessage' no encontrados.");
        }
        
        // Limpiamos localStorage de los campos del formulario
        formFields.forEach(field => { localStorage.removeItem(field.id); });

    } catch (error) {
        console.error("Error al generar el PDF:", error);
        alert('Error al generar el PDF. Por favor inténtalo de nuevo. Asegúrate de que todas las imágenes han sido cargadas correctamente.');
        resetButtonState();
    } finally {
        // Asegurarse de que el botón se habilite si ocurre un error antes de la confirmación final.
        // Si el PDF se genera y se muestra la confirmación, el botón de reset ya recarga la página.
        if (document.getElementById('formContainer').style.display !== 'none') {
            resetButtonState();
        }
    }
}

function imageToBase64(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                // Si la URL es de un archivo local (como img/upower.png), y no se encuentra,
                // fetch lanzará un error 404. Lo capturamos aquí.
                throw new Error(`Error de red o archivo no encontrado: ${response.statusText} (${url})`);
            }
            return response.blob();
        })
        .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }));
}

function resetButtonState() {
    submitButton.disabled = false;
    submitButton.textContent = 'Generar Reclamación';
}