import request from 'supertest';
import app from '../../src/app';

describe('Auth Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    it('rejects missing credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(422);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'notanemail', password: 'pass' });
      expect(res.status).toBe(422);
    });

    it('returns 401 for wrong credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notexist@company.com', password: 'wrongpass' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('has correct response structure', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notexist@company.com', password: 'wrongpass' });
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  describe('Health endpoints', () => {
    it('GET /health returns 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('RBAC', () => {
    it('returns 401 on protected route without auth', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('returns 401 on attendance without auth', async () => {
      const res = await request(app).get('/api/attendance/today');
      expect(res.status).toBe(401);
    });

    it('returns 401 on timesheets without auth', async () => {
      const res = await request(app).get('/api/timesheets');
      expect(res.status).toBe(401);
    });
  });
});
