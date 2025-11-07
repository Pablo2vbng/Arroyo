window.addEventListener('DOMContentLoaded', () => {
    // La única tarea de esta página es preparar el enlace del correo.
    const mailtoLinkElement = document.getElementById('mailtoLink');
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const body = params.get('body');

    if (subject && body && mailtoLinkElement) {
        const recipient = 'nacho@representacionesarroyo.es';
        mailtoLinkElement.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    } else {
        // Fallback por si algo falla
        mailtoLinkElement.href = 'mailto:nacho@representacionesarroyo.es';
    }
});