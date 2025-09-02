import { Router, type IRouter } from 'express';
import { toBuffer } from 'qrcode';
import pLimit from 'p-limit';
import { promises as fs } from 'fs';
import * as path from 'path';
import { generatePDF } from '../utils/pdf-generator.ts';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const multer = require('multer');

const router: IRouter = Router();

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Generate plain PDF from CSV codes
router.post('/generate-csv-pdf', upload.single('csvFile'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const startTime = Date.now();
    
    // Read and parse CSV file
    const csvData = await fs.readFile(req.file.path, 'utf-8');
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    
    // Skip the header row (first line) and extract codes from first column
    const dataLines = lines.slice(1); // Skip header: "QR Code,Assigned to takeback ID,Date Assigned,Status"
    const codes = dataLines.map(line => {
      const columns = line.split(',');
      return columns[0]?.trim().replace(/"/g, '') || ''; // Remove quotes if present
    }).filter(code => code && code.length > 0);

    if (codes.length === 0) {
      return res.status(400).json({ error: 'No valid codes found in CSV file' });
    }

    if (codes.length > 10000) {
      return res.status(400).json({ error: 'Too many codes. Maximum 10000 allowed.' });
    }

    console.log(`Starting generation of ${codes.length} QR codes from CSV...`);

    const limit = pLimit(50);
    const jobs: Array<Promise<void>> = [];
    const generatedCodes: Array<{ token: string; url: string; pngBuffer: Buffer }> = [];
    
    // Ensure output directory exists
    await fs.mkdir('./out', { recursive: true });

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];

      jobs.push(limit(async () => {
        try {
          // Ensure code is valid
          if (!code || code.trim() === '') return;
          
          // Generate PNG buffer for PDF - encode only the code value, not URL
          const pngBuffer = await toBuffer(code, {
            type: 'png',
            errorCorrectionLevel: 'Q',
            margin: 1,
            width: 400, // 300 DPI quality
          });

          generatedCodes.push({
            token: code,
            url: code, // Store the code itself, not a URL
            pngBuffer,
          });

          if ((i + 1) % 100 === 0) {
            console.log(`Generated ${i + 1}/${codes.length} QR codes`);
          }
        } catch (err) {
          console.warn(`Could not generate QR code for ${code}:`, err);
        }
      }));
    }

    await Promise.all(jobs);

    // Sort by original order
    generatedCodes.sort((a, b) => codes.indexOf(a.token) - codes.indexOf(b.token));

    // Generate PDF
    await generatePDF(generatedCodes, './out');

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`CSV PDF generation completed in ${duration.toFixed(2)} seconds`);

    res.json({
      success: true,
      message: `Generated PDF with ${generatedCodes.length} QR codes from CSV`,
      totalCodes: generatedCodes.length,
      duration: `${duration.toFixed(2)} seconds`,
      pdfFile: '/out/qr-codes.pdf'
    });

  } catch (error) {
    console.error('CSV PDF generation error:', error);
    
    // Clean up uploaded file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to generate PDF from CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
