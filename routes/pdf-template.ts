import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { generatePDFTemplate } from '../utils/pdf-template-generator.ts';

const require = createRequire(import.meta.url);
const multer = require('multer');

const router = Router();

// Setup multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const OUT_DIR = './out';

// PDF Template Generation endpoint
router.post('/generate-pdf-template', upload.fields([
  { name: 'csvFile', maxCount: 1 },
  { name: 'pdfTemplate', maxCount: 1 }
]), async (req: any, res: any) => {
  try {
    const csvFile = req.files['csvFile']?.[0];
    const pdfTemplate = req.files['pdfTemplate']?.[0];
    
    if (!csvFile || !pdfTemplate) {
      return res.status(400).json({ error: 'Both CSV and PDF files are required' });
    }

    console.log('Processing PDF template generation...');
    
    // Read and parse CSV file
    const csvContent = await fs.readFile(csvFile.path, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',') || [];
    
    // Parse QR codes from CSV (assuming first column is QR Code)
    const qrCodes = lines.slice(1)
      .map(line => line.split(',')[0]?.trim())
      .filter((code): code is string => code !== undefined && code.length > 0);
    
    if (qrCodes.length === 0) {
      return res.status(400).json({ error: 'No QR codes found in CSV file' });
    }
    
    console.log(`Found ${qrCodes.length} QR codes in CSV`);
    
    // Generate PDF with QR codes overlaid on template
    const outputFilename = `qr-template-${Date.now()}.pdf`;
    await generatePDFTemplate(qrCodes, pdfTemplate.path, outputFilename, OUT_DIR);
    
    // Clean up uploaded files
    await fs.unlink(csvFile.path);
    await fs.unlink(pdfTemplate.path);
    
    res.json({ 
      success: true, 
      count: qrCodes.length,
      filename: outputFilename
    });
  } catch (error) {
    console.error('Error generating PDF template:', error);
    res.status(500).json({ error: 'Failed to generate PDF template' });
  }
});

export default router;
