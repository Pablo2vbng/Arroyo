// --- LÓGICA DE INTERFAZ (SIN CAMBIOS) ---
document.addEventListener('DOMContentLoaded', () => {
    // LÓGICA PARA GUARDAR Y RESTAURAR DATOS DEL FORMULARIO
    const form = document.getElementById('reclamacionForm');
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

    // LÓGICA PARA MENSAJE DE CONFIRMACIÓN DE IMAGEN
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
});

// --- LÓGICA PRINCIPAL DEL FORMULARIO (ENVÍO) ---
const form = document.getElementById('reclamacionForm');
const submitButton = form.querySelector('.btn-enviar');

form.addEventListener('submit', function(event) {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Generando PDF...';

    const formFields = form.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], textarea');
    formFields.forEach(field => {
        localStorage.removeItem(field.id);
    });

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
            generatePdfAndRedirect(data, { delantera, trasera, detalle, etiqueta });
        })
        .catch(error => {
            console.error('Error al leer las imágenes:', error);
            alert(error.message || 'Hubo un problema al cargar las imágenes. Asegúrate de haber seleccionado las 4 fotos.');
            resetButton();
        });
});


// =========================================================================
// ===== INICIO DE LA MODIFICACIÓN: NUEVA FUNCIÓN DE CREACIÓN DE PDF =====
// =========================================================================
async function generatePdfAndRedirect(data, images) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // p: portrait, mm: milímetros, a4: tamaño de hoja

    try {
        // --- 1. CARGAR LOGO DE U-POWER ---
        const upowerLogoBase64 = await imageToBase64('img/upower.avif');

        // --- 2. DIBUJAR LA ESTRUCTURA DEL PDF ---
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        
        // --- Cabecera ---
        doc.addImage(upowerLogoBase64, 'WEBP', margin, 5, 25, 10); // Usamos WEBP como formato genérico para AVIF
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(255, 0, 0); // Rojo
        doc.text('RECLAMACION DE GARANTÍAS', pageWidth / 2, 10, { align: 'center' });
        doc.setDrawColor(0, 0, 0); // Borde negro
        doc.setLineWidth(0.5);
        doc.line(margin, 15, pageWidth - margin, 15); // Línea bajo el título

        let y = 20; // Posición Y inicial
        const fieldHeight = 8;
        const labelWidth = 30;
        const dataWidth = 60;
        const col1X = margin;
        const col2X = margin + labelWidth + dataWidth + 10;
        
        // --- Función auxiliar para dibujar un campo ---
        const drawField = (label, value, x, yPos) => {
            doc.setFontSize(9);
            doc.setFont('Helvetica', 'bold');
            doc.setFillColor(230, 230, 230); // Gris claro para etiquetas
            doc.rect(x, yPos, labelWidth, fieldHeight, 'FD'); // Caja de etiqueta (Fill y Draw)
            doc.setTextColor(0, 0, 0);
            doc.text(label, x + 2, yPos + 5);

            doc.rect(x + labelWidth, yPos, dataWidth, fieldHeight, 'S'); // Caja de datos (Solo Stroke)
            doc.setFont('Helvetica', 'normal');
            doc.text(value || '', x + labelWidth + 2, yPos + 5);
        };

        // --- Dibujar Campos en Dos Columnas ---
        drawField('FECHA', data.fecha, col1X, y);
        drawField('AGENTE', 'Representaciones Arroyo', col2X, y);
        y += fieldHeight;

        drawField('CLIENTE', data.empresa, col1X, y); // 'empresa' del form es 'CLIENTE' aquí
        drawField('CONTACTO', data.contacto, col2X, y);
        y += fieldHeight;

        drawField('MODELO', data.modelo, col1X, y);
        y += fieldHeight;
        
        drawField('REF', data.referencia, col1X, y);
        y += fieldHeight;
        
        drawField('TALLA', data.talla, col1X, y);
        y += fieldHeight + 5; // Espacio extra

        // --- Campo de Descripción ---
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        doc.text('DESCRIPCIÓN DEFECTO', col1X, y);
        y += 3;
        const descHeight = 30;
        doc.rect(col1X, y, contentWidth, descHeight, 'S');
        doc.setFont('Helvetica', 'normal');
        const splitDescription = doc.splitTextToSize(data.defecto, contentWidth - 4); // Ajustar texto
        doc.text(splitDescription, col1X + 2, y + 5);
        y += descHeight + 5;

        // --- Área de Fotografías ---
        const photoAreaHeight = doc.internal.pageSize.getHeight() - y - margin;
        doc.setFillColor(245, 245, 245); // Gris muy claro para el fondo
        doc.rect(margin, y, contentWidth, photoAreaHeight, 'F');
        
        // Colocar imágenes en una cuadrícula 2x2 dentro del área
        const photoMargin = 5;
        const photoGridWidth = (contentWidth - photoMargin) / 2;
        const photoGridHeight = (photoAreaHeight - photoMargin) / 2;

        if (images.delantera) doc.addImage(images.delantera, 'JPEG', col1X, y, photoGridWidth, photoGridHeight);
        if (images.trasera) doc.addImage(images.trasera, 'JPEG', col1X + photoGridWidth + photoMargin, y, photoGridWidth, photoGridHeight);
        if (images.detalle) doc.addImage(images.detalle, 'JPEG', col1X, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);
        if (images.etiqueta) doc.addImage(images.etiqueta, 'JPEG', col1X + photoGridWidth + photoMargin, y + photoGridHeight + photoMargin, photoGridWidth, photoGridHeight);
        
        // --- 3. LÓGICA DE REDIRECCIÓN (SIN CAMBIOS) ---
        const pdfDataUri = doc.output('datauristring');
        sessionStorage.setItem('pdfDataUri', pdfDataUri);
        
        const subject = `Nueva Reclamación de: ${data.empresa} - Factura: ${data.factura}`;
        const body = `Hola,\n\nHas recibido una nueva reclamación de la empresa: ${data.empresa}.\nPersona de contacto: ${data.contacto}.\n\nTodos los detalles y las imágenes están en el archivo PDF adjunto.\n\nSaludos.`;
        
        window.location.href = `confirmacion.html?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Hubo un error al generar el PDF.');
        resetButton();
    }
}
// =========================================================================
// ===== FIN DE LA MODIFICACIÓN =====
// =========================================================================


// --- FUNCIONES AUXILIARES (SIN CAMBIOS) ---
function imageToBase64(url) {
    return fetch(url)
        .then(response => response.blob())
        .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }));
}

function resetButton() {
    submitButton.disabled = false;
    submitButton.textContent = 'Generar Reclamación';
}