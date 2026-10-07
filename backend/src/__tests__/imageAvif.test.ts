import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { convertToAvif, rewriteLocalImageUrl } from '../utils/image';

describe('AVIF conversion', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avif-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function writeJpeg(name: string): Promise<string> {
    const filePath = path.join(tmpDir, name);
    await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 40, b: 40 } },
    })
      .jpeg()
      .toFile(filePath);
    return filePath;
  }

  async function writePng(name: string): Promise<string> {
    const filePath = path.join(tmpDir, name);
    await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 20, g: 180, b: 80, alpha: 1 } },
    })
      .png()
      .toFile(filePath);
    return filePath;
  }

  it('converts a jpeg file to avif and removes the original', async () => {
    const jpegPath = await writeJpeg('photo.jpg');
    const result = await convertToAvif(jpegPath, { publicPrefix: '/uploads' });

    expect(result.avifPath).toBe(path.join(tmpDir, 'photo.avif'));
    expect(result.avifUrl).toBe('/uploads/photo.avif');
    expect(fs.existsSync(result.avifPath)).toBe(true);
    expect(fs.existsSync(jpegPath)).toBe(false);
    const meta = await sharp(result.avifPath).metadata();
    expect(meta.format).toBe('heif');
  });

  it('converts a png file to avif', async () => {
    const pngPath = await writePng('shot.png');
    const result = await convertToAvif(pngPath, { publicPrefix: '/uploads/storyboards' });

    expect(result.avifUrl).toBe('/uploads/storyboards/shot.avif');
    expect(fs.existsSync(result.avifPath)).toBe(true);
    expect(fs.existsSync(pngPath)).toBe(false);
  });

  it('is a no-op when the file is already avif', async () => {
    const jpegPath = await writeJpeg('temp.jpg');
    const first = await convertToAvif(jpegPath, { publicPrefix: '/uploads' });
    const second = await convertToAvif(first.avifPath, { publicPrefix: '/uploads' });

    expect(second.avifPath).toBe(first.avifPath);
    expect(second.avifUrl).toBe('/uploads/temp.avif');
    expect(fs.existsSync(first.avifPath)).toBe(true);
  });

  it('rewrites local raster URLs to .avif and leaves remote URLs unchanged', () => {
    expect(rewriteLocalImageUrl('/uploads/a.jpg')).toBe('/uploads/a.avif');
    expect(rewriteLocalImageUrl('/uploads/a.JPEG')).toBe('/uploads/a.avif');
    expect(rewriteLocalImageUrl('/uploads/storyboards/x.png')).toBe('/uploads/storyboards/x.avif');
    expect(rewriteLocalImageUrl('assets/listings/BTG-rumah-b6269.jpg')).toBe('assets/listings/BTG-rumah-b6269.avif');
    expect(rewriteLocalImageUrl('https://cdn.example.com/photo.jpg')).toBe('https://cdn.example.com/photo.jpg');
    expect(rewriteLocalImageUrl('/uploads/already.avif')).toBe('/uploads/already.avif');
  });
});
