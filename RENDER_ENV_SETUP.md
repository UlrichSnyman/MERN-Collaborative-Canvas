# Render.com Environment Variables Setup

## For Backend Service

Set these environment variables in your Render.com backend service:

1. **MONGODB_URI** - Your MongoDB connection string
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/database`

2. **NODE_ENV** - Set to `production`

3. **FRONTEND_URL** - Your Netlify frontend URL
   - Example: `https://ulsncoca.netlify.app`

4. **JWT_SECRET** - Your JWT secret key (should be a strong random string)
   - Example: `your-super-secret-jwt-key-here`

## Steps to Update on Render.com:

1. Go to your Render.com dashboard
2. Click on your backend service
3. Go to **Environment** tab
4. Update or add these environment variables:
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://ulsncoca.netlify.app`
   - Ensure `MONGODB_URI` and `JWT_SECRET` are set

5. Trigger a manual deploy or the changes will take effect on next auto-deploy

## CORS Configuration

The backend now supports:
- Development: All origins allowed
- Production: Only specified origins (localhost:3000, localhost:3001, and FRONTEND_URL)
