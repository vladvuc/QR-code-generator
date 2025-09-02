import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { customAlphabet } from "nanoid";

const COUNT = 100;
const OUTPUT_DIR = "out";
const PDF_PATH = path.join(OUTPUT_DIR, "qr-codes.pdf");
const CSV_PATH = path.join(OUTPUT_DIR, "qr-codes.csv");

// Short, URL-safe IDs (10 chars is plenty for uniqueness at this scale)
const nanoid = customAlphabet(
  "123456789ABCDEFGHIJKLMNPQRSTUVWXYZ",
  10
);

type Row = { code: string; png: Buffer };

async function makeRows(n: number): Promise<Row[]> {
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    let code = nanoid();
    while (seen.has(code)) code = nanoid();
    seen.add(code);

    // Payload can be just the code, or swap to a URL like `https://your.app/r/${code}`
    const payload = code;

    const png = await QRCode.toBuffer(payload, {
      type: "png",
      errorCorrectionLevel: "Q",
      margin: 1,
      width: 220,
    });
    rows.push({ code, png });
  }
  return rows;
}

function writePdf(rows: Row[], pdfPath: string) {
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  const doc = new PDFDocument({ size: "A4", margin: 36 }); // 0.5" margins
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const usableWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

  const imageSize = 96;         // px -> points (1:1 for PNG)
  const gap = 16;               // space between text and image
  const rowPaddingY = 12;       // vertical padding inside a row
  const rowHeight = imageSize + rowPaddingY * 2;

  const textColWidth = usableWidth - gap - imageSize;

  let xText = left;
  let xImg = left + textColWidth + gap;
  let y = top;

  // Header
  doc.fontSize(14).text("QR Codes", left, y);
  y += 18;

  // Column titles
  doc.fontSize(10).fillColor("#000").text("Code", xText, y);
  doc.text("QR", xImg, y);
  y += 12;

  // Divider
  doc.moveTo(left, y).lineTo(left + usableWidth, y).stroke();
  y += 6;

  doc.fontSize(11);

  for (const { code, png } of rows) {
    // New page if needed
    if (y + rowHeight > pageHeight - doc.page.margins.bottom) {
      doc.addPage();
      y = top;

      doc.fontSize(10).text("Code", xText, y);
      doc.text("QR", xImg, y);
      y += 12;
      doc.moveTo(left, y).lineTo(left + usableWidth, y).stroke();
      y += 6;
      doc.fontSize(11);
    }

    // Row background (optional, light)
    doc.save()
      .rect(left, y, usableWidth, rowHeight)
      .fillOpacity(0.03)
      .fill("#000")
      .restore();

    // Code text (wrap if long; here it’s short)
    doc.fillOpacity(1).fillColor("#000");
    doc.text(code, xText + 8, y + rowPaddingY, {
      width: textColWidth - 16,
      height: rowHeight - rowPaddingY * 2,
      align: "left",
      ellipsis: true,
    });

    // QR image
    doc.image(png, xImg, y + rowPaddingY, { width: imageSize, height: imageSize });

    y += rowHeight + 4; // small gap between rows
  }

  doc.end();
}

function writeCsv(rows: Row[], csvPath: string) {
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  
  // CSV header
  let csvContent = "Code,QR_Payload\n";
  
  // Add each row
  for (const { code } of rows) {
    // Escape any commas or quotes in the code (though our nanoid shouldn't have them)
    const escapedCode = code.includes(',') || code.includes('"') ? `"${code.replace(/"/g, '""')}"` : code;
    csvContent += `${escapedCode},${escapedCode}\n`;
  }
  
  fs.writeFileSync(csvPath, csvContent, 'utf8');
}

(async () => {
  const rows = await makeRows(COUNT);
  writePdf(rows, PDF_PATH);
  writeCsv(rows, CSV_PATH);
  console.log(`Saved: ${PDF_PATH}`);
  console.log(`Saved: ${CSV_PATH}`);
})();
