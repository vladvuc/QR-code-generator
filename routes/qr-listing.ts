import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();
const SVG_OUT_DIR = './qrs-svg';

// List generated QR codes
router.get('/qrs', async (req: any, res: any) => {
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
    <link rel="stylesheet" href="/css/styles.css">
    <style>
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

export default router;
