import { toString } from 'qrcode';
import { customAlphabet } from 'nanoid';
import pLimit from 'p-limit';
import { promises as fs } from 'fs';
import path from 'path';

// short, URL-safe ~10 chars (~64^10 space)
const nanoid = customAlphabet('123456789ABCDEFGHIJKLMNPQRSTUVWXYZ', 10);

const BASE_URL = 'https://okret.be/r/';
const OUT_DIR = './qrs-svg';
const TOTAL = 7000;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const limit = pLimit(50); h
  const jobs: Array<Promise<void>> = [];

  const seen = new Set<string>();
  for (let i = 0; i < TOTAL; i++) {
    let token = nanoid();
    while (seen.has(token)) token = nanoid(); // extra safety in-memory
    seen.add(token);

    const url = BASE_URL + token;

    jobs.push(limit(async () => {
      const svg = await toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'Q', t
        margin: 2,
        width: 512, s
      });
      const file = path.join(OUT_DIR, `${token}.svg`);
      await fs.writeFile(file, svg, 'utf8');
      // Persist token to DB here with status='unassigned'
      // e.g., await db.qRCodes.create({ data: { token, status: 'unassigned' }});
    }));
  }

  await Promise.all(jobs);
  console.log(`Generated ${TOTAL} QR codes to ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
