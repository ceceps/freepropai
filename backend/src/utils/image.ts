import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 200;
const THUMBNAIL_QUALITY = 70;

export interface ThumbnailResult {
  originalPath: string;
  thumbnailPath: string;
  thumbnailUrl: string;
}

/**
 * Generate a thumbnail from an image file.
 * Returns the paths and URL for the thumbnail.
 */
export async function generateThumbnail(
  originalPath: string,
  uploadDir: string
): Promise<ThumbnailResult> {
  const originalFilename = path.basename(originalPath);
  const ext = path.extname(originalFilename);
  const nameWithoutExt = path.basename(originalFilename, ext);
  const thumbnailFilename = `${nameWithoutExt}-thumb${ext}`;
  const thumbnailPath = path.join(uploadDir, thumbnailFilename);
  const thumbnailUrl = `/uploads/${thumbnailFilename}`;

  // If thumbnail already exists, return it
  if (fs.existsSync(thumbnailPath)) {
    return { originalPath, thumbnailPath, thumbnailUrl };
  }

  try {
    await sharp(originalPath)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(thumbnailPath);

    return { originalPath, thumbnailPath, thumbnailUrl };
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    // Return original path as fallback
    return {
      originalPath,
      thumbnailPath: originalPath,
      thumbnailUrl: `/uploads/${originalFilename}`,
    };
  }
}

/**
 * Generate thumbnails for multiple photos
 */
export async function generateThumbnails(
  originalPaths: string[],
  uploadDir: string
): Promise<ThumbnailResult[]> {
  return Promise.all(
    originalPaths.map((p) => generateThumbnail(p, uploadDir))
  );
}