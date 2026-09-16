# Render Frontend Deployment

## Quick Setup (2 minutes)

1. In Render, click "New +" → "Static Site"
2. Select repository: `hrushi0106/eatwms`

## Configuration (Copy & Paste):

**Basic Info:**
```
Name:              eatwms-frontend
Root Directory:    frontend
Build Command:     npm install && npm run build
Publish Directory: dist
```

**Environment Variables:**
```
VITE_API_URL=[YOUR BACKEND URL]/api
```
*Replace [YOUR BACKEND URL] with the URL from backend deployment*

**Redirect Rules (Click "Advanced"):**
```
Source:      /*
Destination: /index.html
Type:        Rewrite
```

## Final Step:
1. After frontend deploys, copy the frontend URL
2. Go back to backend service → Environment tab
3. Add: `FRONTEND_URL=[YOUR FRONTEND URL]`
4. Click "Save Changes"

## Done! 🎉
Your app will be live at the frontend URL with these login credentials:
- Admin: admin@company.com / Admin@123
- Manager: manager@company.com / Manager@123  
- Employee: employee@company.com / Employee@123