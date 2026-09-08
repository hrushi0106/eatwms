import fs from 'fs';
import path from 'path';
import { StorageService, StorageResult } from './StorageService';
import { env } from '../../config/env';

export class LocalStorageService implements StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(env.UPLOAD_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(sourceFilePath: string, destFilename: string): Promise<StorageResult> {
    // In local storage, multer already saved the file; the source = dest
    const relativePath = path.relative(process.cwd(), sourceFilePath);
    return {
      path: relativePath.replace(/\\/g, '/'),
      filename: path.basename(sourceFilePath),
    };
  }

  async delete(filePath: string): Promise<void> {
    const absPath = this.getAbsolutePath(filePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  }

  getAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) return filePath;
    return path.resolve(process.cwd(), filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    return fs.existsSync(this.getAbsolutePath(filePath));
  }
}
