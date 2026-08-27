import PDFDocument from 'pdfkit';

export type PdfSection = {
  title: string;
  lines: string[];
};

/**
 * Produit un rapport PDF paginé.
 *
 * PDFKit gère la pagination, l'encodage et les polices : le rapport n'est
 * plus tronqué à un nombre de lignes arbitraire et les caractères accentués
 * sont rendus correctement.
 */
export function createReportPdf(
  title: string,
  subtitle: string,
  sections: PdfSection[],
) {
  const document = new PDFDocument({ size: 'A4', margin: 50 });

  document.fontSize(18).text(title, { align: 'left' });
  document.moveDown(0.3);
  document.fontSize(10).fillColor('#555555').text(subtitle);
  document.moveDown(1);

  for (const section of sections) {
    document.fillColor('#000000').fontSize(12).text(section.title);
    document.moveDown(0.2);
    document.fontSize(10).fillColor('#333333');
    for (const line of section.lines) {
      document.text(line, { indent: 12 });
    }
    document.moveDown(0.8);
  }

  document
    .fontSize(8)
    .fillColor('#777777')
    .text(
      "Document généré par Cocoashield à titre d'aide à la décision. Ne constitue pas un diagnostic phytosanitaire garanti.",
      { align: 'center' },
    );

  document.end();
  return document;
}
