import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from './errorHandler';

export const MAX_TOTAL_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB total upload limit
export const MAX_PHOTO_COUNT = 10; // Max 10 photos

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (JPEG, PNG, GIF, WEBP)', 400));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per single file limit
    files: 10, // Max 10 files per request
  },
});

export const validatePhotoUploads = (req: Request) => {
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
      // Cleanup uploaded files on disk
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.error('Failed to cleanup file:', file.path);
          }
        }
      });
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      throw new AppError(`Total ukuran file foto yang diunggah (${sizeMB} MB) melebihi batas maksimal 5 MB.`, 400);
    }
  }
};

export default upload;
