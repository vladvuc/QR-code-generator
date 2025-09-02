import { Router } from 'express';
import { toString, toBuffer } from 'qrcode';
import { customAlphabet } from 'nanoid';
import pLimit from 'p-limit';
import { promises as fs } from 'fs';
import path from 'path';
import { generatePDF } from '../utils/pdf-generator.ts';

const router = Router();

// short, URL-safe ~10 chars (~64^10 space)
const nanoid = customAlphabet(
  "123456789ABCDEFGHIJKLMNPQRSTUVWXYZ",
  10
);;

const BASE_URL = 'http://localhost:3000/r/';
const SVG_OUT_DIR = './qrs-svg';
const OUT_DIR = './out';

// Generate QR codes endpoint
router.post('/generate', async (req: any, res: any) => {
  try {
    const { count } = req.body;
    const total = parseInt(count);
    
    if (!total || total < 1 || total > 10000) {
      return res.status(400).json({ error: 'Invalid count. Must be between 1 and 10000.' });
    }

    const startTime = Date.now();
    
    // Ensure output directories exist
    await fs.mkdir(SVG_OUT_DIR, { recursive: true });
    await fs.mkdir(OUT_DIR, { recursive: true });

    const limit = pLimit(50);
    const jobs: Array<Promise<void>> = [];
    const seen = new Set<string>();
    const generatedCodes: Array<{ token: string; url: string; pngBuffer: Buffer }> = [];
    
    console.log(`Starting generation of ${total} QR codes...`);

    for (let i = 0; i < total; i++) {
      let token = nanoid();
      while (seen.has(token)) token = nanoid(); // extra safety in-memory
      seen.add(token);

      const url = BASE_URL + token;

      jobs.push(limit(async () => {
        // Generate SVG for file storage
        const svg = await toString(url, {
          type: 'svg',
          errorCorrectionLevel: 'Q',
          margin: 2,
          width: 512,
        });
        
        // Generate PNG buffer for PDF (300 DPI quality)
        const pngBuffer = await toBuffer(url, {
          type: 'png',
          errorCorrectionLevel: 'Q',
          margin: 1,
          width: 400, // Higher resolution for 300 DPI crisp quality
        });
        
        // Save SVG file
        const svgFile = path.join(SVG_OUT_DIR, `${token}.svg`);
        await fs.writeFile(svgFile, svg, 'utf8');
        
        // Store data for CSV and PDF generation
        generatedCodes.push({ token, url, pngBuffer });
        
        // Log progress every 100 codes
        if ((i + 1) % 100 === 0) {
          console.log(`Generated ${i + 1}/${total} QR codes`);
        }
      }));
    }

    await Promise.all(jobs);
    
    // Generate CSV file
    console.log('Generating CSV file...');
    const csvContent = ['QR Code,Assigned to takeback ID,Date Assigned,Status']
      .concat(generatedCodes.map(item => `${item.token},,,`))
      .join('\n');
    
    const csvFile = path.join(OUT_DIR, 'qr-codes.csv');
    await fs.writeFile(csvFile, csvContent, 'utf8');
    
    // Generate PDF file
    console.log('Generating PDF file...');
    try {
      await generatePDF(generatedCodes, OUT_DIR);
    } catch (error) {
      console.warn('PDF generation failed, continuing without PDF:', error);
      // Continue without PDF generation
    }
    
    const duration = Date.now() - startTime;
    console.log(`Generated ${total} QR codes in ${duration}ms`);
    
    res.json({ 
      success: true, 
      count: total, 
      duration,
      outputDir: OUT_DIR,
      svgDir: SVG_OUT_DIR
    });
  } catch (error) {
    console.error('Error generating QR codes:', error);
    res.status(500).json({ error: 'Failed to generate QR codes' });
  }
});

// Redirect endpoint (for testing the generated QR codes)
router.get('/r/:token', (req: any, res: any) => {
  const { token } = req.params;
  res.send(`
    <h1>QR Code Redirect</h1>
    <p>Token: <strong>${token}</strong></p>
    <p>This would redirect to your actual content.</p>
    <p><a href="/">← Back to Generator</a></p>
  `);
});

export default router;
