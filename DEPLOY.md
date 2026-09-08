# Deployment Guide — Render + Neon

## Overview
- **Database:** Neon (serverless PostgreSQL)
- **Backend:** Render Web Service (Node.js)
- **Frontend:** Render Static Site (React/Vite)

---

## STEP 1 — Push Code to GitHub

```bash
# In d:\timeshhet
git init
git add .
git commit -m "Initial commit — EvoluXion WorkMonitor"

# Create repo on github.com then:
git remote add origin https://github.com/YOUR-USERNAME/eatwms.git
git branch -M main
git push -u origin main
```

---

## STEP 2 — Setup Neon Database

1. Go to https://neon.tech → Sign up
2. Click **"Create Project"**
   - Name: `eatwms`
   - Region: `AWS ap-south-1` (Mumbai)
   - Click **Create**
3. Copy the **Connection String** (looks like):
   ```
   postgresql://eatwms_owner:PASSWORD@ep-xxxx.ap-south-1.aws.neon.tech/eatwms?sslmode=require
   ```
4. Save this — you need it in Step 3

---

## STEP 3 — Deploy Backend to Render

1. Go to https://render.com → Sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   ```
   Name:           eatwms-backend
   Root Directory: backend
   Runtime:        Node
   Build Command:  npm install && npm run build
   Start Command:  npm run start
   ```
5. Click **"Advanced"** → Add Environment Variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | (paste your Neon connection string) |
   | `JWT_SECRET` | (click "Generate" — 32+ chars) |
   | `REFRESH_TOKEN_SECRET` | (click "Generate" — 32+ chars) |
   | `JWT_EXPIRES_IN` | `8h` |
   | `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
   | `BCRYPT_ROUNDS` | `12` |
   | `STORAGE_PROVIDER` | `local` |
   | `UPLOAD_DIR` | `/tmp/uploads` |
   | `LOG_LEVEL` | `warn` |
   | `RATE_LIMIT_WINDOW_MS` | `900000` |
   | `RATE_LIMIT_MAX` | `100` |
   | `LOGIN_RATE_LIMIT_MAX` | `10` |
   | `DEFAULT_TIMEZONE` | `Asia/Kolkata` |
   | `MAX_FILE_SIZE_MB` | `5` |
   | `FRONTEND_URL` | (set after frontend deploy) |

6. Click **"Create Web Service"**
7. Wait for deploy (~3–5 min)
8. Copy your backend URL: `https://eatwms-backend.onrender.com`

---

## STEP 4 — Run Migrations on Neon

Once backend is deployed, open Render **Shell** tab and run:

```bash
NODE_ENV=production npx knex --knexfile knexfile.ts migrate:latest
NODE_ENV=production npx knex --knexfile knexfile.ts seed:run
```

**OR** run from your local machine with the Neon URL:

```powershell
# In d:\timeshhet\backend
$env:DATABASE_URL = "postgresql://eatwms_owner:PASSWORD@ep-xxxx.ap-south-1.aws.neon.tech/eatwms?sslmode=require"
$env:NODE_ENV = "production"
npx knex --knexfile knexfile.ts migrate:latest
npx knex --knexfile knexfile.ts seed:run
```

This creates all 19 tables + seed data on Neon automatically.

---

## STEP 5 — Deploy Frontend to Render

1. In Render → **"New +"** → **"Static Site"**
2. Connect same GitHub repo
3. Configure:
   ```
   Name:                 eatwms-frontend
   Root Directory:       frontend
   Build Command:        npm install && npm run build
   Publish Directory:    dist
   ```
4. Add Environment Variable:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://eatwms-backend.onrender.com/api` |

5. Add Redirect Rule (for React Router SPA):
   ```
   Source:      /*
   Destination: /index.html
   Type:        Rewrite
   ```
6. Click **"Create Static Site"**
7. Your frontend URL: `https://eatwms-frontend.onrender.com`

---

## STEP 6 — Connect Frontend URL to Backend

Go back to **Render Backend** → **Environment** tab:
- Update `FRONTEND_URL` = `https://eatwms-frontend.onrender.com`
- Click **"Save Changes"** → Render auto-redeploys

---

## STEP 7 — Test Everything

```
✅ Open: https://eatwms-frontend.onrender.com
✅ Login with: admin@company.com / Admin@123
✅ Check-in with webcam selfie
✅ View dashboards
✅ Export a report
✅ Test chatbot
```

---

## STEP 8 — Setup GitHub Secrets (for CI/CD auto-deploy)

In GitHub repo → **Settings → Secrets → Actions**, add:

| Secret | Value |
|--------|-------|
| `VITE_API_URL` | `https://eatwms-backend.onrender.com/api` |
| `RENDER_BACKEND_DEPLOY_HOOK` | Get from Render → backend → Settings → Deploy Hook |
| `RENDER_FRONTEND_DEPLOY_HOOK` | Get from Render → frontend → Settings → Deploy Hook |

Now every `git push` to `main` auto-deploys both services.

---

## STEP 9 — Custom Domain (Optional)

In Render → your service → **Settings → Custom Domains**:
```
workmonitor.evoluxiontech.com  →  eatwms-frontend
api.workmonitor.evoluxiontech.com  →  eatwms-backend
```

Then update in DNS provider (GoDaddy/Namecheap):
```
CNAME  workmonitor      →  eatwms-frontend.onrender.com
CNAME  api.workmonitor  →  eatwms-backend.onrender.com
```

---

## Cost Summary

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Neon** | ✅ 512MB, 1 project | Free forever for small teams |
| **Render Backend** | ✅ 750hrs/month | Spins down after 15min idle |
| **Render Frontend** | ✅ Unlimited | Static sites always free |
| **GitHub** | ✅ Free | Public or private repo |
| **Total** | **$0/month** | Perfect for < 50 employees |

> **Note on Render free tier:** The backend spins down after 15 min of inactivity.
> First request after idle takes ~30s to wake up.
> Upgrade to Starter ($7/month) to keep it always-on.

---

## Troubleshooting

**"Cannot connect to database"**
→ Check DATABASE_URL in Render environment variables
→ Make sure it ends with `?sslmode=require`

**"CORS error" in browser**
→ Set FRONTEND_URL in backend env to exact frontend URL

**"Page not found" on refresh**
→ Add the Rewrite rule `/* → /index.html` in Render static site settings

**"Selfie upload fails"**
→ Render's `/tmp` folder works but is cleared on redeploy
→ For permanent storage, integrate Cloudinary (see below)

---

## Optional: Permanent Selfie Storage with Cloudinary

```bash
cd backend
npm install cloudinary
```

Set in Render:
```
STORAGE_PROVIDER=cloudinary
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Free tier: 25GB storage, 25GB bandwidth/month.
