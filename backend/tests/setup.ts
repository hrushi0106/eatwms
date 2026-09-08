import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Increase timeout for integration tests
jest.setTimeout(30000);
