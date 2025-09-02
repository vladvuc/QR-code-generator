import express from 'express';
import { promises as fs } from 'fs';

// Import route modules
import pagesRouter from './routes/pages.ts';
import qrGeneratorRouter from './routes/qr-generator.ts';
import pdfTemplateRouter from './routes/pdf-template.ts';
import qrListingRouter from './routes/qr-listing.ts';
import csvPdfGeneratorRouter from './routes/csv-pdf-generator.ts';

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Static file serving
app.use('/qrs-svg', express.static('./qrs-svg'));
app.use('/out', express.static('./out'));
app.use('/uploads', express.static('uploads'));

// Ensure required directories exist
async function ensureDirectories() {
  const dirs = ['./qrs-svg', './out', './uploads'];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Routes
app.use('/', pagesRouter);
app.use('/', qrGeneratorRouter);
app.use('/', pdfTemplateRouter);
app.use('/', qrListingRouter);
app.use('/', csvPdfGeneratorRouter);

// Start server
ensureDirectories().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 QR Code Generator running at http://localhost:${PORT}`);
    console.log(`📁 QR codes will be saved to: ./out`);
    console.log(`📄 SVG files will be saved to: ./qrs-svg`);
  });
}).catch(error => {
  console.error('Failed to create directories:', error);
  process.exit(1);
});
