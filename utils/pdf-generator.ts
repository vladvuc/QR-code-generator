import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

// Function to generate PDF with QR codes
export async function generatePDF(codes: Array<{ token: string; url: string; pngBuffer: Buffer }>, outputDir: string) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const fsSync = require('fs');
      
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      
      const pdfPath = path.join(outputDir, 'qr-codes.pdf');
      const stream = fsSync.createWriteStream(pdfPath);
      doc.pipe(stream);
      
      // Add title
      doc.fontSize(20).text('QR Codes', { align: 'center' });
      doc.moveDown(2);
      
      let y = doc.y;
      const pageHeight = doc.page.height - 100; // Account for margins
      const itemHeight = 120; // Height per QR code item
      const qrSize = 100; // QR code size
      
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        if (!code) continue;
        
        // Check if we need a new page
        if (y + itemHeight > pageHeight) {
          doc.addPage();
          y = 50;
        }
        
        // Add code text (left side)
        doc.fontSize(14).text(`Code: ${code.token}`, 50, y + 10);
        doc.fontSize(10).text(`URL: ${code.url}`, 50, y + 30, { width: 300 });
        
        try {
          // Add QR code image (right side)
          doc.image(code.pngBuffer, 400, y, { width: qrSize, height: qrSize });
        } catch (err) {
          console.warn(`Could not embed QR code for ${code.token}:`, err);
          doc.rect(400, y, qrSize, qrSize).stroke();
          doc.fontSize(8).text('[QR Code Error]', 420, y + 45, { width: 60, align: 'center' });
        }
        
        y += itemHeight;
        
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
