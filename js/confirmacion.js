window.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA REVISADA ---
    
    // Elementos de la página
    const viewPdfButton = document.getElementById('viewPdfButton');
    const mailtoLinkElement = document.getElementById('mailtoLink');
    const pdfErrorElement = document.getElementById('pdfError');

    // 1. Recuperar los datos del PDF desde el almacenamiento temporal
    const pdfDataUri = sessionStorage.getItem('pdfDataUri');

    if (pdfDataUri && viewPdfButton) {
        // Si encontramos los datos del PDF, mostramos el botón
        viewPdfButton.style.display = 'inline-block';
        
        // 2. AÑADIMOS UN ESCUCHADOR DE CLICS
        // Esta es la clave: window.open() ahora se ejecuta por un clic directo del usuario.
        viewPdfButton.addEventListener('click', (event) => {
            event.preventDefault(); // Previene que el enlace '#' navegue
            try {
                window.open(pdfDataUri, '_blank');
            } catch (e) {
                console.error("Error al abrir PDF:", e);
                alert("No se pudo abrir el PDF. Es posible que tu navegador esté bloqueando las ventanas emergentes.");
            }
        });
        
    } else {
        // Si no hay datos de PDF, mostramos un error y ocultamos el botón
        if(viewPdfButton) viewPdfButton.style.display = 'none';
        if(pdfErrorElement) pdfErrorElement.style.display = 'block';
    }

    // 3. La lógica del enlace de correo sigue igual
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const body = params.get('body');

    if (subject && body && mailtoLinkElement) {
        const recipient = 'nacho@representacionesarroyo.es';
        mailtoLinkElement.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    } else {
        mailtoLinkElement.href = 'mailto:nacho@representacionesarroyo.es';
    }
});