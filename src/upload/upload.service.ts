import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

let sharpInstance: any = null;
try {
  sharpInstance = require('sharp');
} catch (e) {
  // Graceful fallback if native module is not yet compiled
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created uploads directory at ${this.uploadDir}`);
    }
  }

  /**
   * Compress and save uploaded image file using Sharp image compressor.
   */
  async saveImageFile(file: any, prefix: string = 'image') {
    if (!file) {
      throw new BadRequestException('No image file provided in request (field: "file")');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif',
      'image/avif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed types: JPEG, PNG, WebP, SVG, GIF, AVIF`,
      );
    }

    // Max 15MB file limit
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('File size exceeds maximum limit of 15MB');
    }

    const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, '');
    const randomHex = crypto.randomBytes(6).toString('hex');
    const isSvg = file.mimetype === 'image/svg+xml';
    const isGif = file.mimetype === 'image/gif';

    let fileBuffer: Buffer;
    if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (file.path) {
      fileBuffer = await fs.promises.readFile(file.path);
    } else {
      throw new BadRequestException('Invalid file buffer or path');
    }

    const originalSize = file.size || fileBuffer.length;
    let finalBuffer: Buffer = fileBuffer;
    let filename: string;
    let finalMimetype: string = file.mimetype;
    let width: number | undefined;
    let height: number | undefined;

    // Apply Sharp compression unless it's an SVG or GIF
    if (sharpInstance && !isSvg && !isGif) {
      try {
        const image = sharpInstance(fileBuffer);
        const metadata = await image.metadata();

        // Compress and convert to high-performance WebP
        const pipeline = sharpInstance(fileBuffer)
          .rotate() // Auto-orient based on EXIF
          .resize({
            width: 2048,
            height: 2048,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({
            quality: 82,
            effort: 4,
          });

        finalBuffer = await pipeline.toBuffer();
        const compressedMeta = await sharpInstance(finalBuffer).metadata();
        width = compressedMeta.width;
        height = compressedMeta.height;
        finalMimetype = 'image/webp';
        filename = `${safePrefix}-${Date.now()}-${randomHex}.webp`;
      } catch (err: any) {
        this.logger.warn(`Sharp compression skipped: ${err.message}. Falling back to raw file.`);
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        filename = `${safePrefix}-${Date.now()}-${randomHex}${ext}`;
      }
    } else {
      const ext = isSvg ? '.svg' : isGif ? '.gif' : path.extname(file.originalname).toLowerCase() || '.jpg';
      filename = `${safePrefix}-${Date.now()}-${randomHex}${ext}`;
    }

    const destinationPath = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(destinationPath, finalBuffer);

    const compressedSize = finalBuffer.length;
    const compressionRatio =
      originalSize > 0
        ? `${Math.round(((originalSize - compressedSize) / originalSize) * 100)}%`
        : '0%';

    const relativeUrl = `/uploads/${filename}`;
    this.logger.log(
      `Saved compressed image: ${filename} (Original: ${Math.round(originalSize / 1024)}KB -> Compressed: ${Math.round(compressedSize / 1024)}KB, Saved ${compressionRatio})`,
    );

    return {
      filename,
      originalName: file.originalname,
      mimetype: finalMimetype,
      originalSize,
      compressedSize,
      savedBytes: originalSize - compressedSize,
      compressionRatio,
      width,
      height,
      url: relativeUrl,
    };
  }

  /**
   * Delete uploaded file from disk.
   */
  async deleteFile(urlOrFilename: string) {
    try {
      const filename = path.basename(urlOrFilename);
      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Deleted file: ${filename}`);
        return true;
      }
      return false;
    } catch (err: any) {
      this.logger.warn(`Could not delete file ${urlOrFilename}: ${err.message}`);
      return false;
    }
  }
}
