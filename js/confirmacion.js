window.addEventListener('DOMContentLoaded', () => {
    // 1. Leer los parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const body = params.get('body');

    // 2. Encontrar el enlace en la página
    const mailtoLinkElement = document.getElementById('mailtoLink');

    if (subject && body && mailtoLinkElement) {
        const recipient = 'nacho@representacionesarroyo.com';
        
        // 3. Construir y asignar el enlace mailto completo
        mailtoLinkElement.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    } else {
        // En caso de que alguien llegue a la página directamente, se pone un enlace simple.
        mailtoLinkElement.href = 'mailto:nacho@representacionesarroyo.com';
    }
});