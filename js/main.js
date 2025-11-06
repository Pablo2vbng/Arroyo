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
            generatePdfAndRedirect(data, { delantera, trasera, detalle, etiqueta });
        })
        .catch(error => {
            console.error('Error al leer las imágenes:', error);
            alert(error.message || 'Hubo un problema al cargar las imágenes. Asegúrate de haber seleccionado las 4 fotos.');
            resetButton();
        });
});

async function generatePdfAndRedirect(data, images) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    try {
        // La creación del PDF sigue siendo idéntica
        const logoBase64 = await imageToBase64('img/logo.jpg');
        doc.addImage(logoBase64, 'JPEG', 15, 12, 25, 25, 'logo', 'NONE', 0);
        // ... (todo el código de diseño del PDF que ya funciona)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor('#005A9C');
        doc.text('Reclamación de Producto', 50, 25);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor('#333333');
        doc.text(`Nº Reclamación: ${data.factura}-${data.fecha}`, 50, 32);
        doc.setDrawColor('#f97316');
        doc.setLineWidth(0.5);
        doc.line(15, 45, 195, 45);

        let y = 55;
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor('#f97316');
        doc.text('Datos del Cliente', 15, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor('#000000');
        doc.text(`Fecha: ${data.fecha}`, 20, y);
        doc.text(`Empresa: ${data.empresa}`, 100, y);
        y += 7;
        doc.text(`Nº Factura: ${data.factura}`, 20, y);
        doc.text(`Teléfono: ${data.telefono}`, 100, y);
        y += 7;
        doc.text(`Contacto: ${data.contacto}`, 20, y);
        y += 12;

        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor('#f97316');
        doc.text('Detalles del Producto', 15, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor('#000000');
        doc.text(`Modelo: ${data.modelo}`, 20, y);
        doc.text(`Referencia: ${data.referencia}`, 70, y);
        doc.text(`Talla: ${data.talla}`, 140, y);
        y += 10;
        
        doc.setFont('Helvetica', 'bold');
        doc.text('Descripción del Defecto:', 20, y);
        y += 6;
        doc.setFont('Helvetica', 'normal');
        const splitDescription = doc.splitTextToSize(data.defecto, 170);
        doc.text(splitDescription, 20, y);
        y += (splitDescription.length * 5) + 10;

        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor('#f97316');
        doc.text('Fotografías Adjuntas', 15, y);
        y += 8;
        
        const imgWidth = 80;
        const imgHeight = 60;
        if (images.delantera) doc.addImage(images.delantera, 'JPEG', 18, y + 2, imgWidth, imgHeight);
        if (images.trasera) doc.addImage(images.trasera, 'JPEG', 108, y + 2, imgWidth, imgHeight);
        y += imgHeight + 10;
        if (images.detalle) doc.addImage(images.detalle, 'JPEG', 18, y + 2, imgWidth, imgHeight);
        if (images.etiqueta) doc.addImage(images.etiqueta, 'JPEG', 108, y + 2, imgWidth, imgHeight);

        // --- CAMBIO CLAVE PARA MÓVILES ---
        // 1. En lugar de .save(), generamos el PDF como una URL de datos (data URI).
        const pdfDataUri = doc.output('datauristring');
        
        // 2. Guardamos esa URL en el almacenamiento de la sesión del navegador.
        // La siguiente página podrá leerla desde aquí.
        sessionStorage.setItem('pdfDataUri', pdfDataUri);
        
        // 3. Preparamos los datos del correo y redirigimos como antes.
        const subject = `Nueva Reclamación de: ${data.empresa} - Factura: ${data.factura}`;
        const body = `Hola,\n\nHas recibido una nueva reclamación de la empresa: ${data.empresa}.\nPersona de contacto: ${data.contacto}.\n\nTodos los detalles y las imágenes están en el archivo PDF adjunto.\n\nSaludos.`;
        
        window.location.href = `confirmacion.html?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Hubo un error al generar el PDF.');
        resetButton();
    }
}

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
    submitButton.textContent = 'Enviar Reclamación';
}