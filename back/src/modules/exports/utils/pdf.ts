function escapePdf(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function createSimplePdf(title: string, lines: string[]): Buffer {
  const contentLines = [title, ...lines].slice(0, 48);
  let y = 800;
  const commands = ['BT', '/F1 16 Tf', `50 ${y} Td`, `(${escapePdf(contentLines[0] ?? title)}) Tj`, '/F1 10 Tf'];
  for (const line of contentLines.slice(1)) {
    y -= 15;
    commands.push(`0 -15 Td (${escapePdf(line)}) Tj`);
  }
  commands.push('ET');
  const stream = Buffer.from(commands.join('\n'), 'latin1');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream.toString('latin1')}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(body, 'latin1');
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, 'latin1');
}
