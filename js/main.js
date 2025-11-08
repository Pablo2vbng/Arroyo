document.addEventListener('DOMContentLoaded', () => {
    // Lógica para persistencia de datos del formulario (esto sí va aquí)
    const form = document.getElementById('reclamacionForm');
    const formFields = form.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], textarea');
    
    const saveData = () => { 
        formFields.forEach(field => localStorage.setItem(field.id, field.value)); 
    };
    const loadData = () => { 
        formFields.forEach(field => { 
            const savedValue = localStorage.getItem(field.id); 
            if (savedValue) { 
                field.value = savedValue; 
            } 
        }); 
    };
    
    formFields.forEach(field => field.addEventListener('input', saveData));
    loadData();

    // Mensaje de subida de imagen (esto sí va aquí)
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

    // El botón de reset para este formulario no es necesario si la confirmación va en otra página
    // o debería recargar la página actual para un nuevo formulario.
    // Si quieres un botón de "Nueva Reclamación" en la página de confirmación, eso se maneja en confirmacion.js
});

const form = document.getElementById('reclamacionForm');
const submitButton = form.querySelector('.btn-enviar');

form.addEventListener('submit', function(event) {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Preparando reclamación...';

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
                // Modificado para un mensaje más claro
                reject(new Error(`La imagen "${input.labels[0].textContent}" es obligatoria. Por favor, adjúntala.`));
            }
        });
    });

    Promise.all(filePromises)
        .then(imagesBase64 => {
            const [delantera, trasera, detalle, etiqueta] = imagesBase64;
            
            // Creamos un payload para guardar en sessionStorage
            const payload = {
                data: data,
                images: { delantera, trasera, detalle, etiqueta }
            };

            // Guardamos el payload en sessionStorage
            sessionStorage.setItem('reclamacionData', JSON.stringify(payload));

            // Preparamos los parámetros para el mailto que se usará en confirmacion.html
            const subject = `Nueva Reclamación de: ${data.empresa} - Factura: ${data.factura || 'N/A'}`;
            const body = `Hola,\n\nHas recibido una nueva reclamación de la empresa: ${data.empresa}.\nPersona de contacto: ${data.contacto}.\n\nTodos los detalles y las imágenes están en el archivo PDF adjunto.\n\nSaludos.`;
            
            const encodedSubject = encodeURIComponent(subject);
            const encodedBody = encodeURIComponent(body);

            // Redirigimos a la página de confirmación con los parámetros del correo
            window.location.href = `confirmacion.html?subject=${encodedSubject}&body=${encodedBody}`;

            // Limpiamos localStorage de los campos del formulario después de redirigir
            formFields.forEach(field => { localStorage.removeItem(field.id); });

        })
        .catch(error => {
            alert(error.message || 'Hubo un problema al cargar las imágenes o preparar la reclamación.');
            resetButtonState();
        });
});

function resetButtonState() {
    submitButton.disabled = false;
    submitButton.textContent = 'Generar Reclamación';
}

// NOTA: Las funciones imageToBase64 y generatePdfAndShowConfirmation YA NO VAN AQUÍ.
// Serán movidas a confirmacion.js, ya que es confirmacion.html quien genera el PDF.