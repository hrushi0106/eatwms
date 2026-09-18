# 🔒 Network Security Configuration for EATWMS

## Render IP Ranges

Your EATWMS application deployed on Render will use these IP ranges:

```
74.220.52.0/24 (74.220.52.1 - 74.220.52.254)
74.220.60.0/24 (74.220.60.1 - 74.220.60.254)
```

## Required Configuration Steps

### 1. Neon Database Whitelist

**Critical**: Your Neon PostgreSQL database must allow connections from Render IPs.

**Steps:**
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Navigate to **Settings → IP Allow**
4. Add IP ranges:
   - `74.220.52.0/24`
   - `74.220.60.0/24`
5. Click **Save**

**Verification:**
```bash
# Test database connection from Render (in deployment logs)
# Should see: "Database connected" message
```

### 2. Firewall Configuration (If Applicable)

If you have additional firewalls or security groups:

**Allow Inbound:**
- Port: `5432` (PostgreSQL)
- From: `74.220.52.0/24, 74.220.60.0/24`
- Protocol: TCP

**Allow Outbound:**
- Port: `443` (HTTPS)
- To: Any (0.0.0.0/0)
- Protocol: TCP

### 3. Corporate Network (If Applicable)

If accessing from corporate networks, also whitelist:
- Your office/VPN IP ranges
- Development team IP addresses

## Security Best Practices

### Database Security
- ✅ SSL/TLS encryption enabled (required by Neon)
- ✅ Strong password policy enforced
- ✅ Limited database user permissions
- ✅ IP-based access control configured

### Application Security
- ✅ JWT tokens with secure secrets
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ Security headers enabled (Helmet)

### Network Security
- ✅ HTTPS-only connections
- ✅ Database connections encrypted
- ✅ File uploads restricted and validated
- ✅ No sensitive data in logs

## Troubleshooting Network Issues

### Database Connection Refused
```
Error: connect ECONNREFUSED
```
**Solution:** Check IP whitelist in Neon console

### Timeout Errors
```
Error: connect ETIMEDOUT
```
**Solution:** Verify firewall rules allow Render IP ranges

### SSL Certificate Errors
```
Error: self signed certificate
```
**Solution:** Ensure SSL settings are configured properly in DATABASE_URL

### CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Verify FRONTEND_URL environment variable matches actual frontend domain

## Network Monitoring

### Health Check Endpoints
- Backend: `https://eatwms-backend.onrender.com/health`
- Database: `https://eatwms-backend.onrender.com/health/db`

### Connection Verification
```bash
# Test from local machine
curl -I https://eatwms-backend.onrender.com/health

# Expected response
HTTP/2 200 
content-type: application/json
```

## IP Range Updates

Render may update IP ranges. Monitor:
- [Render Documentation](https://render.com/docs)
- Render Dashboard notifications
- Update whitelist accordingly

## Emergency Access

If locked out due to IP restrictions:
1. Check Render dashboard for current IP ranges
2. Update Neon IP whitelist immediately
3. Redeploy services if needed
4. Verify health endpoints respond

---

**Note**: These IP ranges are specific to Render's infrastructure. Always verify current ranges in Render's official documentation.