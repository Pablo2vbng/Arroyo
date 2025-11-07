document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE PERSISTENCIA DEL FORMULARIO ---
    const form = document.getElementById('reclamacionForm');
    if (form) {
        const formFields = form.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], textarea');
        const saveData = () => {
            formFields.forEach(field => {
                localStorage.setItem(field.id, field.value);
            });
        };
        const loadData = () => {
            formFields.forEach(field => {
                const savedValue = localStorage.getItem(field.id);
                if (savedValue) {
                    field.value = savedValue;
                }
            });
        };
        formFields.forEach(field => {
            field.addEventListener('input', saveData);
        });
        loadData();

        // --- LÓGICA DE CONFIRMACIÓN DE SUBIDA DE IMAGEN ---
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                const parentContainer = event.target.closest('.input-ejemplo');
                const successMessage = parentContainer.querySelector('.upload-success-message');
                if (event.target.files.length > 0) {
                    successMessage.style.display = 'inline';
                } else {
                    successMessage.style.display = 'none';
                }
            });
        });
    }

    // Lógica para el botón "Crear otra reclamación"
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            window.location.reload();
        });
    }
});

// --- LÓGICA PRINCIPAL DE ENVÍO DEL FORMULARIO ---
const form = document.getElementById('reclamacionForm');
const submitButton = form.querySelector('.btn-enviar');

form.addEventListener('submit', function(event) {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Generando PDF...';

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
                reject(new Error(`Por favor, adjunta la imagen para el campo: ${input.labels[0].textContent}`));
            }
        });
    });

    Promise.all(filePromises)
        .then(imagesBase64 => {
            const [delantera, trasera, detalle, etiqueta] = imagesBase64;
            generatePdfAndShowConfirmation(data, { delantera, trasera, detalle, etiqueta });
        })
        .catch(error => {
            console.error('Error al leer las imágenes:', error);
            alert(error.message || 'Hubo un problema al cargar las imágenes. Asegúrate de haber seleccionado las 4 fotos.');
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
        
        try {
            const upowerLogoBase64 = await imageToBase64('img/upower.png');
            doc.addImage(upowerLogoBase64, 'PNG', margin, 5, 25, 10);
        } catch (logoError) {
            console.warn('No se pudo cargar el logo de U-Power desde "img/upower.png". El PDF se generará sin él.', logoError);
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
            doc.setFontSize(9); doc.setFont('Helvetica', 'bold'); doc.setFillColor(230, 230, 230);
            doc.rect(x, yPos, labelWidth, fieldHeight, 'FD'); doc.setTextColor(0, 0, 0);
            doc.text(label, x + 2, yPos + 5); doc.rect(x + labelWidth, yPos, dataWidth, fieldHeight, 'S');
            doc.setFont('Helvetica', 'normal'); doc.text(value || '', x + labelWidth + 2, yPos + 5);
        };

        drawField('FECHA', data.fecha, col1X, y); drawField('AGENTE', 'Representaciones Arroyo', col2X, y); y += fieldHeight;
        drawField('CLIENTE', data.empresa, col1X, y); drawField('CONTACTO', data.contacto, col2X, y); y += fieldHeight;
        drawField('MODELO', data.modelo, col1X, y); y += fieldHeight;
        drawField('REF', data.referencia, col1X, y); y += fieldHeight;
        drawField('TALLA', data.talla, col1X, y); y += fieldHeight + 5;

        doc.setFontSize(9); doc.setFont('Helvetica', 'bold'); doc.text('DESCRIPCIÓN DEFECTO', col1X, y); y += 3;
        const descHeight = 30;
        doc.rect(col1X, y, contentWidth, descHeight, 'S');
        doc.setFont('Helvetica', 'normal');
        const splitDescription = doc.splitTextToSize(data.defecto, contentWidth - 4);
        doc.text(splitDescription, col1X + 2, y + 5); y += descHeight + 5;

        const photoAreaHeight = doc.internal.pageSize.getHeight() - y - margin;
        doc.setFillColor(245, 245, 245); doc.rect(margin, y, contentWidth, photoAreaHeight, 'F');
        
        const photoMargin = 5;
        const photoGridWidth = (contentWidth - photoMargin) / 2;
        const photoGridHeight = (photoAreaHeight - photoMargin) / 2;
        if (images.delantera) doc.addImage(images.delantera, 'JPEG', col1X, y, photoGridWidth, photoGridHeight);
        if (images.trasera) doc.addImage(images.trasera, 'JPEG', col1X + photoGridWidth + photoMargin, y, photoGridWidth, photoGridHeight);
        if (images.detalle) doc.addImage(images.detalle, 'JPEG', col1X, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);
        if (images.etiqueta) doc.addImage(images.etiqueta, 'JPEG', col1X + photoGridWidth + photoMargin, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);
        
        // ===== CAMBIO CLAVE PARA MÁXIMA COMPATIBILIDAD =====
        // 1. Generamos el PDF como una URL de Datos (Data URI)
        const pdfDataUri = doc.output('datauristring');
        const pdfName = `reclamacion_${data.empresa.replace(/\s/g, '_')}.pdf`;
        
        // 2. Buscamos nuestro enlace invisible y le asignamos los datos del PDF
        const pdfLink = document.getElementById('pdfLink');
        pdfLink.href = pdfDataUri;
        pdfLink.download = pdfName; // Esto hace que en Android/PC se descargue. iOS lo ignora y lo abre.
        
        // 3. Hacemos clic en el enlace. Esta es la acción que abre/descarga el PDF.
        pdfLink.click();
        
        // 4. Mostramos el mensaje de confirmación
        const formContainer = document.getElementById('formContainer');
        const confirmationMessage = document.getElementById('confirmationMessage');
        const mailtoLink = document.getElementById('mailtoLink');
        
        const subject = `Nueva Reclamación de: ${data.empresa} - Factura: ${data.factura}`;
        const body = `Hola,\n\nHas recibido una nueva reclamación de la empresa: ${data.empresa}.\nPersona de contacto: ${data.contacto}.\n\nTodos los detalles y las imágenes están en el archivo PDF adjunto.\n\nSaludos.`;
        
        mailtoLink.href = `mailto:nacho@representacionesarroyo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        formContainer.style.display = 'none';
        confirmationMessage.style.display = 'block';

        // 5. Limpiamos los datos guardados ahora que el proceso ha finalizado con éxito
        const formFields = form.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], textarea');
        formFields.forEach(field => {
            localStorage.removeItem(field.id);
        });

    } catch (error) {
        console.error('Error general al generar el PDF:', error);
        alert('Ha ocurrido un error al generar el PDF. Por favor, revisa la consola para más detalles.');
        resetButtonState();
    }
}

function imageToBase64(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error de red al cargar la imagen: ${response.statusText}`);
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