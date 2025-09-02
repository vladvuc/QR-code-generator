import { toBuffer } from 'qrcode';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

const BASE_URL = 'http://localhost:3000/r/';

// Function to generate PDF template with QR codes
export async function generatePDFTemplate(qrCodes: string[], templatePath: string, outputFilename: string, outputDir: string) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const fsSync = require('fs');
      
      // Create new PDF document
      const doc = new PDFDocument({ 
        margin: 0,
        size: 'A4'
      });
      
      const outputPath = path.join(outputDir, outputFilename);
      const stream = fsSync.createWriteStream(outputPath);
      doc.pipe(stream);
      
      // A4 dimensions in points (72 points = 1 inch)
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      
      // QR code dimensions: 4cm x 4cm converted to points
      // 4cm = 4 * 28.35 = 113.4 points
      const qrSize = 113.4; // 4cm in points
      
      // Center coordinates
      const centerX = (pageWidth - qrSize) / 2;
      const centerY = (pageHeight - qrSize) / 2;
      
      console.log(`Generating PDF with QR codes at center position: ${centerX}, ${centerY}`);
      
      for (let i = 0; i < qrCodes.length; i++) {
        const qrCode = qrCodes[i];
        
        if (i > 0) {
          doc.addPage();
        }
        
        try {
          // Generate QR code as PNG buffer
          const qrUrl = BASE_URL + qrCode;
          const qrBuffer = await toBuffer(qrUrl, {
            type: 'png',
            errorCorrectionLevel: 'Q',
            margin: 1,
            width: Math.round(qrSize * 2), // Higher resolution for better quality
          });
          
          // Add QR code to center of page
          doc.image(qrBuffer, centerX, centerY, { 
            width: qrSize, 
            height: qrSize 
          });
          
          // Add QR code text below the image
          doc.fontSize(10)
             .text(qrCode, centerX, centerY + qrSize + 10, { 
               width: qrSize, 
               align: 'center' 
             });
          
          if ((i + 1) % 10 === 0) {
            console.log(`Generated ${i + 1}/${qrCodes.length} QR code pages`);
          }
          
        } catch (err) {
          console.warn(`Could not generate QR code for ${qrCode}:`, err);
          // Add error placeholder
          doc.rect(centerX, centerY, qrSize, qrSize).stroke();
          doc.fontSize(12)
             .text('QR Error', centerX + 10, centerY + qrSize/2 - 6);
          doc.fontSize(10)
             .text(qrCode, centerX, centerY + qrSize + 10, { 
               width: qrSize, 
               align: 'center' 
             });
        }
      }
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`PDF template generation completed: ${outputFilename}`);
        resolve();
      });
      
      stream.on('error', (err: any) => {
        console.error('PDF template generation error:', err);
        reject(err);
      });
      
    } catch (error) {
      console.error('PDF template generation error:', error);
      reject(error);
    }
  });
}
