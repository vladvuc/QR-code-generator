import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

// Function to generate PDF with QR codes (styled like generate-qr-pdf.ts)
export async function generatePDF(codes: Array<{ token: string; url: string; pngBuffer: Buffer }>, outputDir: string) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const fsSync = require('fs');
      
      const doc = new PDFDocument({ size: "A4", margin: 36 }); // 0.5" margins
      
      const pdfPath = path.join(outputDir, 'qr-codes.pdf');
      const stream = fsSync.createWriteStream(pdfPath);
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

      doc.fontSize(11); // Back to original font size for table-style PDF

      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        if (!code) continue;

        // New page if needed
        if (y + rowHeight > pageHeight - doc.page.margins.bottom) {
          doc.addPage();
          y = top;

          doc.fontSize(10).text("Code", xText, y);
          doc.text("QR", xImg, y);
          y += 12;
          doc.moveTo(left, y).lineTo(left + usableWidth, y).stroke();
          y += 6;
          doc.fontSize(11); // Back to original font size for table-style PDF
        }

        // Row background (optional, light)
        doc.save()
          .rect(left, y, usableWidth, rowHeight)
          .fillOpacity(0.03)
          .fill("#000")
          .restore();

        // Code text (wrap if long; here it's short)
        doc.fillOpacity(1).fillColor("#000");
        doc.text(code.token, xText + 8, y + rowPaddingY, {
          width: textColWidth - 16,
          height: rowHeight - rowPaddingY * 2,
          align: "left",
          ellipsis: true,
        });

        try {
          // QR image
          doc.image(code.pngBuffer, xImg, y + rowPaddingY, { width: imageSize, height: imageSize });
        } catch (err) {
          console.warn(`Could not embed QR code for ${code.token}:`, err);
          doc.rect(xImg, y + rowPaddingY, imageSize, imageSize).stroke();
          doc.fontSize(8).text('[QR Error]', xImg + 10, y + rowPaddingY + imageSize/2 - 4);
        }

        y += rowHeight + 4; // small gap between rows

        if ((i + 1) % 50 === 0) {
          console.log(`Added ${i + 1}/${codes.length} codes to PDF`);
        }
      }
      
      doc.end();
      
      stream.on('finish', () => {
        console.log('PDF generation completed');
        resolve();
      });
      
      stream.on('error', (err: any) => {
        console.error('PDF generation error:', err);
        reject(err);
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}
