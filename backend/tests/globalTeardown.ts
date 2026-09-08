export default async function globalTeardown() {
  try {
    const db = (await import('../src/config/database')).default;
    await db.destroy();
  } catch {
    // ignore
  }
}
