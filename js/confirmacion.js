window.addEventListener('DOMContentLoaded', () => {
    const viewPdfButton = document.getElementById('viewPdfButton');
    const mailtoLinkElement = document.getElementById('mailtoLink');
    const pdfErrorElement = document.getElementById('pdfError');
    
    const pdfDataUri = sessionStorage.getItem('pdfDataUri');

    if (pdfDataUri) {
        viewPdfButton.style.display = 'inline-block';
        viewPdfButton.addEventListener('click', (event) => {
            event.preventDefault();
            try {
                // Esta acción, al ser un clic directo, es permitida por iOS
                window.open(pdfDataUri, '_blank');
            } catch (e) {
                alert("No se pudo abrir el PDF. Por favor, revisa si tu navegador bloquea ventanas emergentes.");
            }
        });
    } else {
        viewPdfButton.style.display = 'none';
        pdfErrorElement.style.display = 'block';
    }

    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const body = params.get('body');

    if (subject && body) {
        const recipient = 'nacho@representacionesarroyo.com';
        mailtoLinkElement.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    } else {
        mailtoLinkElement.href = 'mailto:nacho@representacionesarroyo.com';
    }
});