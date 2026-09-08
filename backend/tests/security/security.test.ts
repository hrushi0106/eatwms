import request from 'supertest';
import app from '../../src/app';

describe('Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    it('handles SQL injection in email field', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: "' OR '1'='1", password: 'anything' });
      expect([400, 401, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('handles SQL injection in query params', async () => {
      const res = await request(app)
        .get("/api/users?search='; DROP TABLE users; --")
        .set('Authorization', 'Bearer invalid');
      expect(res.status).toBe(401); // Fails at auth, not SQL
    });
  });

  describe('Rate Limiting', () => {
    it('has rate limit headers', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'pass' });
      expect(res.headers).toHaveProperty('ratelimit-limit');
    });
  });

  describe('File Upload Security', () => {
    it('rejects requests to check-in without auth', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in')
        .attach('selfie', Buffer.from('fake'), 'test.jpg');
      expect(res.status).toBe(401);
    });
  });

  describe('JWT Validation', () => {
    it('rejects malformed JWT', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.MALFORMED.PAYLOAD');
      expect(res.status).toBe(401);
    });

    it('rejects expired JWT (simulated)', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsImV4cCI6MX0.fake';
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });

    it('rejects token without Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'sometoken');
      expect(res.status).toBe(401);
    });
  });

  describe('Security Headers', () => {
    it('has X-Content-Type-Options header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('has security headers from Helmet', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Access Control', () => {
    it('blocks access to audit logs without ADMIN role', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('blocks access to user management without auth', async () => {
      const res = await request(app).post('/api/users').send({});
      expect(res.status).toBe(401);
    });

    it('selfie images require authentication', async () => {
      const res = await request(app).get('/api/verifications/1/image');
      expect(res.status).toBe(401);
    });
  });
});
