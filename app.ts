import express from 'express';
import { toString, toBuffer } from 'qrcode';
import { customAlphabet } from 'nanoid';
import pLimit from 'p-limit';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// short, URL-safe ~10 chars (~64^10 space)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_', 10);

const app = express();
const PORT = 3000;
const BASE_URL = 'http://localhost:3000/r/';
const SVG_OUT_DIR = './qrs-svg';
const OUT_DIR = './out';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/qrs', express.static(SVG_OUT_DIR));
app.use('/out', express.static(OUT_DIR));

// Serve the main page
app.get('/', (req: any, res: any) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Code Generator</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input[type="number"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
        }
        input[type="number"]:focus {
            border-color: #4CAF50;
            outline: none;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #45a049;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        #status {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            display: none;
        }
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .progress {
            width: 100%;
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
            display: none;
        }
        .progress-bar {
            height: 100%;
            background-color: #4CAF50;
            width: 0%;
            transition: width 0.3s ease;
        }
        .download-links {
            margin-top: 20px;
            display: none;
        }
        .download-links a {
            display: inline-block;
            margin: 5px 10px 5px 0;
            padding: 8px 15px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 3px;
        }
        .download-links a:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 QR Code Generator</h1>
        <form id="qrForm">
            <div class="form-group">
                <label for="count">Number of QR codes to generate:</label>
                <input type="number" id="count" name="count" min="1" max="10000" value="100" required>
            </div>
            <button type="submit" id="generateBtn">Generate QR Codes</button>
        </form>
        
        <div class="progress" id="progress">
            <div class="progress-bar" id="progressBar"></div>
        </div>
        
        <div id="status"></div>
        
        <div class="download-links" id="downloadLinks">
            <h3>Generated Files:</h3>
            <a href="/qrs" target="_blank">View SVG QR Codes</a>
            <a href="/out/qr-codes.csv" target="_blank">Download CSV</a>
            <a href="/out/qr-codes.pdf" target="_blank">Download PDF</a>
        </div>
    </div>

    <script>
        const form = document.getElementById('qrForm');
        const statusDiv = document.getElementById('status');
        const generateBtn = document.getElementById('generateBtn');
        const progressDiv = document.getElementById('progress');
        const progressBar = document.getElementById('progressBar');
        const downloadLinks = document.getElementById('downloadLinks');

        function showStatus(message, type) {
            statusDiv.textContent = message;
            statusDiv.className = type;
            statusDiv.style.display = 'block';
        }

        function updateProgress(percent) {
            progressBar.style.width = percent + '%';
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const count = parseInt(document.getElementById('count').value);
            
            if (count < 1 || count > 10000) {
                showStatus('Please enter a number between 1 and 10000', 'error');
                return;
            }

            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            progressDiv.style.display = 'block';
            downloadLinks.style.display = 'none';
            
            showStatus('Starting QR code generation...', 'info');
            updateProgress(0);

            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ count }),
                });

                if (!response.ok) {
                    throw new Error('Generation failed');
                }

                const result = await response.json();
                showStatus(\`Successfully generated \${result.count} QR codes in \${result.duration}ms!\`, 'success');
                downloadLinks.style.display = 'block';
                updateProgress(100);
            } catch (error) {
                showStatus('Error generating QR codes: ' + error.message, 'error');
            } finally {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate QR Codes';
                setTimeout(() => {
                    progressDiv.style.display = 'none';
                    updateProgress(0);
                }, 3000);
            }
        });
    </script>
</body>
</html>
  `);
});

// Generate QR codes endpoint
app.post('/generate', async (req: any, res: any) => {
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
        
        // Generate PNG buffer for PDF
        const pngBuffer = await toBuffer(url, {
          type: 'png',
          errorCorrectionLevel: 'Q',
          margin: 2,
          width: 200,
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
      await generatePDF(generatedCodes);
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

// Function to generate PDF with QR codes
async function generatePDF(codes: Array<{ token: string; url: string; pngBuffer: Buffer }>) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      // Import PDFKit using require for CommonJS compatibility
      const PDFDocument = require('pdfkit');
      const fsSync = require('fs');
      
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      
      const pdfPath = path.join(OUT_DIR, 'qr-codes.pdf');
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

// Redirect endpoint (for testing the generated QR codes)
app.get('/r/:token', (req: any, res: any) => {
  const { token } = req.params;
  res.send(`
    <h1>QR Code Redirect</h1>
    <p>Token: <strong>${token}</strong></p>
    <p>This would redirect to your actual content.</p>
    <p><a href="/">← Back to Generator</a></p>
  `);
});

// List generated QR codes
app.get('/qrs', async (req: any, res: any) => {
  try {
    const files = await fs.readdir(SVG_OUT_DIR);
    const svgFiles = files.filter(file => file.endsWith('.svg')).sort();
    
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated QR Codes</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        h1 { color: #333; text-align: center; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .qr-item { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; background: #fafafa; }
        .qr-item img { max-width: 100%; height: auto; border: 1px solid #ccc; }
        .token { font-family: monospace; font-size: 12px; color: #666; margin-top: 10px; word-break: break-all; }
        .back-link { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
        .back-link:hover { background: #45a049; }
        .stats { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">← Back to Generator</a>
        <h1>Generated QR Codes</h1>
        <div class="stats">
            <strong>Total QR codes: ${svgFiles.length}</strong>
        </div>
        <div class="grid">`;

    for (const file of svgFiles) {
      const token = path.basename(file, '.svg');
      html += `
        <div class="qr-item">
          <img src="/qrs-svg/${file}" alt="QR Code ${token}">
          <div class="token">Token: ${token}</div>
          <div class="token"><a href="/r/${token}" target="_blank">Test Link</a></div>
        </div>`;
    }

    html += `
        </div>
    </div>
</body>
</html>`;
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>Could not list QR codes. Make sure some have been generated first.</p>
      <a href="/">← Back to Generator</a>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 QR Code Generator running at http://localhost:${PORT}`);
  console.log(`📁 QR codes will be saved to: ${path.resolve(OUT_DIR)}`);
});
