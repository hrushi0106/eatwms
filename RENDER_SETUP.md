# 🚀 Render Deployment Guide for EATWMS

## Prerequisites: Network Configuration

### Neon Database IP Whitelisting (Important!)

Before deploying, ensure Render can access your Neon database:

1. **Go to [Neon Console](https://console.neon.tech)**
2. **Select your project: `neondb`**
3. **Navigate to Settings → IP Allow**  
4. **Add these Render IP ranges:**
   ```
   74.220.52.0/24
   74.220.60.0/24
   ```
5. **Save the configuration**

Without this step, your backend won't be able to connect to the database!

---

## Step 1: Deploy Backend Service

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect GitHub Repository:**
   - Select: `hrushi0106/eatwms`
   - Repository connected: ✅

4. **Configure Service Settings:**
   ```
   Name: eatwms-backend (or keep eatwms-1 if already created)
   Region: Oregon (US West)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: ./start.sh
   Node Version: 18 (or latest)
   ```

   **Alternative Start Commands (if shell script doesn't work):**
   ```
   Start Command: npm run migrate:prod && npm run seed:prod && npm start
   ```

5. **Environment Variables** (Add these in Environment tab):
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=postgresql://neondb_owner:npg_Ng6mElK9BZVH@ep-jolly-salad-axmmis1a-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   JWT_SECRET=supersecurejwtkeyforrenderdeployment32characters
   JWT_EXPIRES_IN=7d
   REFRESH_TOKEN_SECRET=supersecurerefreshkeyforrenderdeployment32chars
   REFRESH_TOKEN_EXPIRES_IN=7d
   FRONTEND_URL=https://eatwms-frontend.onrender.com
   BCRYPT_ROUNDS=12
   LOG_LEVEL=info
   DEFAULT_TIMEZONE=Asia/Kolkata
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   LOGIN_RATE_LIMIT_MAX=10
   RENDER_IP_RANGES=74.220.52.0/24,74.220.60.0/24
   ```

6. **Click "Create Web Service"**

## Step 2: Deploy Frontend Service

1. **Click "New +" → "Static Site"**
2. **Connect Same Repository:**
   - Select: `hrushi0106/eatwms` 

3. **Configure Static Site:**
   ```
   Name: eatwms-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm ci && npm run build
   Publish Directory: dist
   ```

4. **Environment Variables:**
   ```
   VITE_API_URL=https://eatwms-backend.onrender.com/api
   ```

5. **Click "Create Static Site"**

## Step 3: Update Backend with Frontend URL

1. **Go back to backend service**
2. **Update Environment Variable:**
   ```
   FRONTEND_URL=https://eatwms-frontend.onrender.com
   ```
3. **Redeploy backend service**

## Step 4: Verify Deployment

**Your URLs will be:**
- Frontend: `https://eatwms-frontend.onrender.com`
- Backend: `https://eatwms-backend.onrender.com`
- API: `https://eatwms-backend.onrender.com/api`
- Health: `https://eatwms-backend.onrender.com/health`

**Test Login:**
- Admin: `admin@company.com` / `Admin@123`
- Manager: `manager@company.com` / `Manager@123`

## Troubleshooting

**If Backend Build Fails:**
- **Docker Error**: Ensure Runtime is set to "Node", not "Docker"
- **Dockerfile Error**: If you see "failed to read dockerfile", change Runtime to Node
- Check build logs for specific errors
- Ensure all dependencies are in package.json
- Verify TypeScript compiles without errors

**If Frontend Build Fails:**
- Check if VITE_API_URL is set correctly
- Verify frontend build command works locally

**If Database Connection Fails:**
- Check DATABASE_URL is exactly as provided
- Ensure Neon database is accessible
- Verify SSL settings in connection string

**If CORS Errors:**
- Ensure FRONTEND_URL matches your actual frontend URL
- Check both services are deployed and running

## Success Indicators

✅ Backend shows "Live" status  
✅ Frontend shows "Live" status  
✅ Health endpoint returns 200 OK  
✅ Login page loads without errors  
✅ Can login with test accounts  
✅ Dashboard loads after login  

Your EATWMS application is now live on Render! 🎉