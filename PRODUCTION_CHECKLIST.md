# EATWMS Production Deployment Checklist

## Pre-Deployment Checklist ✅

### Security Configuration
- [ ] **JWT Secrets**: Changed from default development values
- [ ] **Database**: Using Neon PostgreSQL (production-ready)
- [ ] **HTTPS**: Enabled (automatic with Render)
- [ ] **CORS**: Configured for production domains
- [ ] **Rate Limiting**: Enabled and configured
- [ ] **Password Hashing**: Using bcrypt with adequate rounds (12)

### Environment Variables

#### Backend (Required)
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `DATABASE_URL` (Your Neon connection string)
- [ ] `JWT_SECRET` (32+ characters, cryptographically secure)
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `FRONTEND_URL` (Your Render frontend URL)
- [ ] `BCRYPT_ROUNDS=12`

#### Frontend (Required)  
- [ ] `VITE_API_URL` (Your Render backend URL + /api)

### Code Quality
- [ ] **TypeScript**: No compilation errors
- [ ] **Linting**: No lint errors
- [ ] **Build**: Successful production build
- [ ] **Tests**: All tests passing (if applicable)

## Post-Deployment Verification ✅

### Backend Health Checks
- [ ] Health endpoint: `https://your-backend.onrender.com/health`
- [ ] Database health: `https://your-backend.onrender.com/health/db`
- [ ] CORS headers present in responses
- [ ] Rate limiting working (test multiple rapid requests)

### Frontend Functionality
- [ ] Login page loads correctly
- [ ] Client-side routing works (direct URL access)
- [ ] Dark/light theme toggle working
- [ ] API calls successful
- [ ] Authentication flow complete
- [ ] Dashboard loads after login

### Database Operations
- [ ] Migrations ran successfully
- [ ] Seed data inserted correctly
- [ ] Login with test accounts works
- [ ] CRUD operations functional

## Test Account Verification

After deployment, verify these accounts work:

```
Admin: admin@company.com / Admin@123
Manager: manager@company.com / Manager@123
Team Lead: teamlead@company.com / Lead@123
Employee: employee@company.com / Employee@123
```

## Production URLs

- **Frontend**: https://your-frontend-name.onrender.com
- **Backend**: https://your-backend-name.onrender.com
- **API**: https://your-backend-name.onrender.com/api
- **Health**: https://your-backend-name.onrender.com/health

## Security Best Practices ✅

### Immediate Post-Deployment
- [ ] **Change default passwords** for all test accounts
- [ ] **Create real admin user** with secure credentials
- [ ] **Remove or disable** development test accounts if needed
- [ ] **Verify SSL/TLS** certificates are valid

### Ongoing Security
- [ ] **Monitor logs** regularly
- [ ] **Update dependencies** regularly
- [ ] **Backup database** strategy in place (Neon handles this)
- [ ] **Monitor Render service health**

## Performance Optimization ✅

### Backend
- [ ] Database connection pooling configured
- [ ] Compression middleware enabled
- [ ] Request/response logging optimized for production
- [ ] Error handling doesn't expose sensitive info

### Frontend
- [ ] Code splitting implemented (React.lazy)
- [ ] Assets optimized and compressed
- [ ] Source maps disabled for production
- [ ] Bundle size reasonable (<2MB total)

## Monitoring Setup

### Application Monitoring
- [ ] Setup error tracking (e.g., Sentry)
- [ ] Monitor API response times
- [ ] Track user authentication metrics
- [ ] Database performance monitoring

### Infrastructure Monitoring  
- [ ] Render service health monitoring
- [ ] Neon database metrics
- [ ] SSL certificate expiration alerts
- [ ] Domain/DNS monitoring

## Backup & Recovery

### Database
- [ ] **Automated backups**: Neon provides automatic backups
- [ ] **Manual backup**: Export critical data manually
- [ ] **Recovery testing**: Test restore procedure

### Application
- [ ] **Source code**: Backed up in Git repository
- [ ] **Environment configs**: Documented and backed up
- [ ] **Deployment configs**: Render settings documented

## Troubleshooting Guide

### Common Issues
1. **"Not Found" errors**: Check _redirects file in frontend build
2. **CORS errors**: Verify FRONTEND_URL environment variable
3. **Database connection**: Check DATABASE_URL and Neon status
4. **Build failures**: Check logs in Render dashboard

### Debug Steps
1. Check Render service logs
2. Verify all environment variables set
3. Test health endpoints
4. Check Neon database connectivity
5. Verify frontend build output includes _redirects

## Deployment Success Criteria ✅

Your deployment is successful when:
- [ ] All health checks pass
- [ ] Login works with test accounts
- [ ] Dashboard loads and displays data
- [ ] Dark/light mode toggle works
- [ ] Client-side routing works (no 404 on direct URLs)
- [ ] API responses are fast (<2 seconds)
- [ ] No console errors in browser
- [ ] Mobile responsive design works

## Next Steps

After successful deployment:
1. **Domain Setup**: Configure custom domain if needed
2. **User Training**: Prepare user documentation
3. **Data Migration**: Import real employee data
4. **Monitoring Setup**: Configure alerts and monitoring
5. **Regular Maintenance**: Schedule updates and backups

---

**🚀 Congratulations!** Your EATWMS system is now live and ready for production use!