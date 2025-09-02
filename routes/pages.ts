import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Serve HTML pages
router.get('/', async (req, res) => {
  try {
    const html = await fs.readFile(path.join(__dirname, '../views/index.html'), 'utf8');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

router.get('/pdf-template', async (req, res) => {
  try {
    const html = await fs.readFile(path.join(__dirname, '../views/pdf-template.html'), 'utf8');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
});

export default router;
