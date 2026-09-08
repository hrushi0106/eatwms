import { env } from '../../config/env';
import { StorageService } from './StorageService';
import { LocalStorageService } from './LocalStorageService';

let storageInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageInstance) {
    if (env.STORAGE_PROVIDER === 's3') {
      // S3StorageService would be imported here in production
      // For now fall back to local
      storageInstance = new LocalStorageService();
    } else {
      storageInstance = new LocalStorageService();
    }
  }
  return storageInstance;
}
