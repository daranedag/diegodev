function generarPDF() {
    let pdf = new jsPDF('p', 'pt', 'a4');
    let options = { pagesplit: true };

    pdf.addHTML($('body'), options, () => {
        pdf.guardar('miDocumento.pdf');
    });
}

generarPDF();
