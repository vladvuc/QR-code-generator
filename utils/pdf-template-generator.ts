import { toBuffer } from 'qrcode';
import { createRequire } from 'module';
import { promises as fs } from 'fs';
import * as path from 'path';

const require = createRequire(import.meta.url);

const BASE_URL = 'http://localhost:3000/r/';

// Function to generate PDF template with QR codes overlaid on uploaded PDF
export async function generatePDFTemplate(qrCodes: string[], templatePath: string, outputFilename: string, outputDir: string) {
  try {
    const { PDFDocument, rgb } = require('pdf-lib');
    
    // Read the uploaded PDF template
    const existingPdfBytes = await fs.readFile(templatePath);
    
    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    
    if (pages.length === 0) {
      throw new Error('The uploaded PDF has no pages');
    }
    
    // Use the first page as template for all QR codes
    const templatePage = pages[0];
    const { width: pageWidth, height: pageHeight } = templatePage.getSize();
    
    console.log(`Template page size: ${pageWidth} x ${pageHeight} points`);
    
    // QR code dimensions: 4cm x 4cm converted to points
    // 4cm = 4 * 28.35 = 113.4 points
    const qrSize = 113.4; // 4cm in points
    
    // Center coordinates
    const centerX = (pageWidth - qrSize) / 2;
    const centerY = (pageHeight - qrSize) / 2;
    
    console.log(`QR codes will be placed at center position: ${centerX}, ${centerY}`);
    console.log(`Processing ${qrCodes.length} QR codes...`);
    
    // Create a new PDF document for output
    const outputPdf = await PDFDocument.create();
    
    for (let i = 0; i < qrCodes.length; i++) {
      const qrCode = qrCodes[i];
      
      try {
        // Copy the template page to the output PDF
        const [copiedPage] = await outputPdf.copyPages(pdfDoc, [0]);
        const page = outputPdf.addPage(copiedPage);
        
        // Generate QR code as PNG buffer
        const qrUrl = BASE_URL + qrCode;
        const qrBuffer = await toBuffer(qrUrl, {
          type: 'png',
          errorCorrectionLevel: 'Q',
          margin: 1,
          width: Math.round(qrSize * 3), // Higher resolution for better quality
        });
        
        // Embed the QR code image in the PDF
        const qrImage = await outputPdf.embedPng(qrBuffer);
        
        // Draw the QR code on the page at the center
        page.drawImage(qrImage, {
          x: centerX,
          y: centerY,
          width: qrSize,
          height: qrSize,
        });
        
        // Optionally add QR code text below the image
        page.drawText(qrCode, {
          x: centerX,
          y: centerY - 20,
          size: 8,
          color: rgb(0, 0, 0),
        });
        
        if ((i + 1) % 10 === 0) {
          console.log(`Processed ${i + 1}/${qrCodes.length} QR codes`);
        }
        
      } catch (err) {
        console.warn(`Could not generate QR code for ${qrCode}:`, err);
        
        // Copy the template page anyway and add error text
        const [copiedPage] = await outputPdf.copyPages(pdfDoc, [0]);
        const page = outputPdf.addPage(copiedPage);
        
        // Add error text at center
        page.drawText(`QR Error: ${qrCode}`, {
          x: centerX,
          y: centerY,
          size: 12,
          color: rgb(1, 0, 0), // Red color for error
        });
      }
    }
    
    // Save the output PDF
    const outputPath = path.join(outputDir, outputFilename);
    const pdfBytes = await outputPdf.save();
    await fs.writeFile(outputPath, pdfBytes);
    
    console.log(`PDF template generation completed: ${outputFilename}`);
    
  } catch (error) {
    console.error('PDF template generation error:', error);
    throw error;
  }
}
