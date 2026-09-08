export interface StorageResult {
  path: string;
  filename: string;
}

export interface StorageService {
  upload(sourceFilePath: string, destFilename: string): Promise<StorageResult>;
  delete(filePath: string): Promise<void>;
  getAbsolutePath(filePath: string): string;
  exists(filePath: string): Promise<boolean>;
}
