window.addEventListener('DOMContentLoaded', () => {
    // --- NUEVO: ABRIR EL PDF DESDE EL ALMACENAMIENTO TEMPORAL ---
    const pdfDataUri = sessionStorage.getItem('pdfDataUri');
    
    if (pdfDataUri) {
        // Si encontramos los datos del PDF, lo abrimos en una nueva pestaña.
        window.open(pdfDataUri, '_blank');
        // Limpiamos el almacenamiento para que no se vuelva a abrir si el usuario recarga la página.
        sessionStorage.removeItem('pdfDataUri');
    }
    
    // --- LÓGICA DEL ENLACE DE CORREO (SIN CAMBIOS) ---
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const body = params.get('body');

    const mailtoLinkElement = document.getElementById('mailtoLink');

    if (subject && body && mailtoLinkElement) {
        const recipient = 'nacho@representacionesarroyo.com';
        mailtoLinkElement.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    } else {
        mailtoLinkElement.href = 'mailto:nacho@representacionesarroyo.com';
    }
});