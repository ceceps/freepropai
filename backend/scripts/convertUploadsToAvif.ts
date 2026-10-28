import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { convertToAvif } from '../src/utils/image';

dotenv.config();

const RASTER = /\.(jpe?g|png)$/i;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (RASTER.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function publicPrefixFor(filePath: string, root: string, urlPrefix: string): string {
  const relDir = path.relative(root, path.dirname(filePath)).replace(/\\/g, '/');
  if (!relDir || relDir === '.') return urlPrefix;
  return `${urlPrefix.replace(/\/+$/, '')}/${relDir}`;
}

async function convertDir(root: string, urlPrefix: string): Promise<{ converted: number; failed: number; skipped: number }> {
  const files = walk(root);
  let converted = 0;
  let failed = 0;
  let skipped = 0;

  const concurrency = 3;
  let index = 0;

  async function worker() {
    while (index < files.length) {
      const current = index;
      index += 1;
      const filePath = files[current];
      if (/\/test-\d+-\d+\.jpe?g$/i.test(filePath)) {
        skipped += 1;
        continue;
      }
      const avifPath = filePath.replace(RASTER, '.avif');
      if (fs.existsSync(avifPath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        skipped += 1;
        continue;
      }
      try {
        await convertToAvif(filePath, {
          publicPrefix: publicPrefixFor(filePath, root, urlPrefix),
          effort: 2,
        });
        converted += 1;
        if (converted % 25 === 0) {
          console.log(`[avif] ${urlPrefix}: ${converted}/${files.length} converted`);
        }
      } catch (err) {
        failed += 1;
        console.warn(`[avif] failed ${filePath}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return { converted, failed, skipped };
}

async function main() {
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  const assetsDir = process.env.ASSETS_BASE_DIR ? path.resolve(process.env.ASSETS_BASE_DIR) : null;

  console.log(`[avif] converting uploads at ${uploadDir}`);
  const uploads = await convertDir(uploadDir, '/uploads');
  console.log('[avif] uploads', uploads);

  if (process.env.SKIP_PIPELINE_ASSETS === '1') {
    console.log('[avif] SKIP_PIPELINE_ASSETS=1, skipping pipeline assets');
  } else if (assetsDir && fs.existsSync(assetsDir)) {
    console.log(`[avif] converting pipeline assets at ${assetsDir}`);
    const assets = await convertDir(assetsDir, 'assets');
    console.log('[avif] assets', assets);
  } else {
    console.log('[avif] ASSETS_BASE_DIR missing or not on disk, skipping pipeline assets');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
