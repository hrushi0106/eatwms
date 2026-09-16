# Render Backend Deployment

## Quick Setup (3 minutes)

1. Go to: https://render.com
2. Click "Get Started for Free" → "GitHub"
3. Click "New +" → "Web Service"
4. Select repository: `hrushi0106/eatwms`

## Configuration (Copy & Paste):

**Basic Info:**
```
Name:            eatwms-backend
Root Directory:  backend
Runtime:         Node
Build Command:   npm install && npm run build
Start Command:   npm run start
```

**Environment Variables:**
```
NODE_ENV=production
DATABASE_URL=[PASTE YOUR NEON CONNECTION STRING HERE]
JWT_SECRET=eatwms-production-jwt-secret-32-chars-minimum-2024
REFRESH_TOKEN_SECRET=eatwms-production-refresh-secret-32-chars-minimum-2024
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
STORAGE_PROVIDER=local
UPLOAD_DIR=/tmp/uploads
DEFAULT_TIMEZONE=Asia/Kolkata
MAX_FILE_SIZE_MB=5
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=10
```

## After Deployment:
1. Go to "Shell" tab in your service
2. Run: `npm run migrate:prod`
3. Run: `npm run seed:prod`
4. Copy your backend URL (e.g., https://eatwms-backend-xxxx.onrender.com)