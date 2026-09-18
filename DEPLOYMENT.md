# EATWMS Deployment Guide for Render

This guide will help you deploy the Employee Attendance, Timesheet & Work Monitoring System to Render.

## Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to a GitHub repository
2. **Neon Database**: You already have this set up
3. **Render Account**: Sign up at [render.com](https://render.com)

## Deployment Steps

### 1. Backend Deployment

1. **Connect GitHub Repository**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your EATWMS code

2. **Configure Backend Service**
   - **Name**: `eatwms-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run migrate:prod && npm run seed:prod && npm start`

3. **Environment Variables**
   Add these in Render's Environment section:
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=postgresql://neondb_owner:npg_Ng6mElK9BZVH@ep-jolly-salad-axmmis1a-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://your-frontend-name.onrender.com
   ```

4. **Deploy Backend**
   - Click "Create Web Service"
   - Wait for deployment to complete

### 2. Frontend Deployment

1. **Create New Static Site**
   - In Render Dashboard, click "New +" → "Static Site"
   - Connect the same GitHub repository

2. **Configure Frontend Service**
   - **Name**: `eatwms-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

3. **Environment Variables**
   Add this in Render's Environment section:
   ```
   VITE_API_URL=https://your-backend-name.onrender.com/api
   ```

4. **Deploy Frontend**
   - Click "Create Static Site"
   - Wait for deployment to complete

### 3. Update Backend with Frontend URL

1. Go back to your backend service settings
2. Update the `FRONTEND_URL` environment variable with your actual frontend URL
3. Redeploy the backend service

## Important Notes

### Database
- Your Neon PostgreSQL database is already configured
- Migrations and seeds will run automatically on deployment
- Database connection string includes SSL requirements for Neon

### Default Login Credentials
After deployment, use these credentials to log in:
- **Admin**: `admin@company.com` / `Admin@123`
- **Manager**: `manager@company.com` / `Manager@123`
- **Team Lead**: `teamlead@company.com` / `Lead@123`
- **Employee**: `employee@company.com` / `Employee@123`

### SSL & HTTPS
- Render provides free SSL certificates
- All connections will be HTTPS by default
- CORS is configured to allow your frontend domain

### Monitoring
- Health check endpoint: `https://your-backend-name.onrender.com/health`
- Database health: `https://your-backend-name.onrender.com/health/db`

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check the build logs in Render dashboard
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript compilation passes

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correctly set
   - Check Neon database is accessible
   - Ensure SSL is enabled

3. **CORS Errors**
   - Update `FRONTEND_URL` in backend environment variables
   - Ensure both services are deployed and running

4. **Environment Variables**
   - Double-check all required environment variables are set
   - Ensure no trailing spaces in variable values
   - JWT_SECRET should be at least 32 characters

### Logs
- View logs in Render dashboard under each service
- Backend logs show database connection status
- Frontend deployment logs show build process

## Production Considerations

1. **Security**
   - Change default passwords immediately
   - Use strong JWT secrets
   - Enable rate limiting (already configured)

2. **Performance**
   - Consider upgrading from free tier for production use
   - Monitor database performance in Neon dashboard
   - Enable Redis for session caching if needed

3. **Backup**
   - Neon handles database backups automatically
   - Consider additional backup strategies for critical data

## Support

If you encounter issues:
1. Check Render service logs
2. Verify Neon database connectivity
3. Ensure all environment variables are correctly set
4. Review this deployment guide steps

Your EATWMS application should now be successfully deployed and accessible via the Render URLs!