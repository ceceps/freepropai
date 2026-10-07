import fs from 'fs';
import path from 'path';

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 200;
const AVIF_QUALITY = 50;
const AVIF_EFFORT = 2;
const RASTER_EXT = /\.(jpe?g|png)$/i;

export interface ThumbnailResult {
  originalPath: string;
  thumbnailPath: string;
  thumbnailUrl: string;
}

export interface AvifConvertOptions {
  publicPrefix: string;
  quality?: number;
  effort?: number;
}

export interface AvifConvertResult {
  avifPath: string;
  avifUrl: string;
}

export function rewriteLocalImageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return url.replace(RASTER_EXT, '.avif');
}

function publicUrl(prefix: string, filename: string): string {
  const trimmed = prefix.replace(/\/+$/, '');
  return `${trimmed}/${filename}`;
}

export async function convertToAvif(
  filePath: string,
  options: AvifConvertOptions
): Promise<AvifConvertResult> {
  const ext = path.extname(filePath);
  const dir = path.dirname(filePath);
  const nameWithoutExt = path.basename(filePath, ext);
  const avifFilename = `${nameWithoutExt}.avif`;
  const avifPath = path.join(dir, avifFilename);
  const avifUrl = publicUrl(options.publicPrefix, avifFilename);

  if (ext.toLowerCase() === '.avif') {
    return { avifPath: filePath, avifUrl: publicUrl(options.publicPrefix, path.basename(filePath)) };
  }

  if (fs.existsSync(avifPath) && path.resolve(filePath) !== path.resolve(avifPath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // original may already be gone
    }
    return { avifPath, avifUrl };
  }

  const { default: sharp } = await import('sharp');
  await sharp(filePath)
    .rotate()
    .avif({
      quality: options.quality ?? AVIF_QUALITY,
      effort: options.effort ?? AVIF_EFFORT,
    })
    .toFile(avifPath);

  if (path.resolve(filePath) !== path.resolve(avifPath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // original may already be gone
    }
  }

  return { avifPath, avifUrl };
}

export async function convertToAvifOrKeep(
  filePath: string,
  options: AvifConvertOptions
): Promise<AvifConvertResult> {
  try {
    return await convertToAvif(filePath, options);
  } catch (error) {
    console.warn(`[avif] conversion failed for ${filePath}:`, error);
    return {
      avifPath: filePath,
      avifUrl: publicUrl(options.publicPrefix, path.basename(filePath)),
    };
  }
}

export async function generateThumbnail(
  originalPath: string,
  uploadDir: string
): Promise<ThumbnailResult> {
  const originalFilename = path.basename(originalPath);
  const ext = path.extname(originalFilename);
  const nameWithoutExt = path.basename(originalFilename, ext);
  const thumbnailFilename = `${nameWithoutExt}-thumb.avif`;
  const thumbnailPath = path.join(uploadDir, thumbnailFilename);
  const thumbnailUrl = `/uploads/${thumbnailFilename}`;

  if (fs.existsSync(thumbnailPath)) {
    return { originalPath, thumbnailPath, thumbnailUrl };
  }

  try {
    const { default: sharp } = await import('sharp');
    await sharp(originalPath)
      .rotate()
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
      .toFile(thumbnailPath);

    return { originalPath, thumbnailPath, thumbnailUrl };
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return {
      originalPath,
      thumbnailPath: originalPath,
      thumbnailUrl: `/uploads/${originalFilename}`,
    };
  }
}

export async function generateThumbnails(
  originalPaths: string[],
  uploadDir: string
): Promise<ThumbnailResult[]> {
  return Promise.all(
    originalPaths.map((p) => generateThumbnail(p, uploadDir))
  );
}
