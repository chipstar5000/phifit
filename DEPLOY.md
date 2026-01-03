# PhiFit Deployment Guide

## Required Environment Variables

Set these in your Vercel project settings (or `.env` for local development):

### 1. Database Connection
```
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
```
- Get this from your Neon.tech dashboard
- Make sure to use the pooled connection string for better performance

### 2. JWT Secret (CRITICAL!)
```
JWT_SECRET="your-randomly-generated-secret-key"
```
- **MUST be changed from default!**
- Generate a secure key using: `openssl rand -base64 32`
- This is used to sign session tokens - keep it secret!

### 3. App Configuration
```
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```
- Your production URL (used for redirects, emails, etc.)

### 4. Rate Limiting (Optional)
```
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=900000
```
- Defaults are fine for most use cases
- Adjust if you need stricter/looser login limits

## Vercel Deployment Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Set Environment Variables**
   - In Vercel dashboard: Settings > Environment Variables
   - Add each variable listed above
   - **Make sure to add them for Production, Preview, and Development**

4. **Deploy**
   - Vercel will automatically deploy on push
   - Or click "Deploy" in Vercel dashboard

5. **Run Database Migrations**
   ```bash
   # If needed, run migrations on first deploy
   npx prisma db push
   ```

## Common Issues

### "INVALID_REQUEST_METHOD" error
- **Cause**: API routes trying to use edge runtime with argon2 (native addon)
- **Fix**: Already fixed! Auth routes now use `runtime = "nodejs"`

### "An error occurred. Please try again." on registration/login
- **Cause**: Missing or incorrect environment variables
- **Fix**: Double-check JWT_SECRET and DATABASE_URL are set correctly in Vercel

### Database connection errors
- **Cause**: Wrong connection string or database not accessible
- **Fix**: Use the **pooled connection string** from Neon.tech
- Make sure connection string includes `sslmode=require`

### Session not persisting
- **Cause**: JWT_SECRET changed or not set
- **Fix**: Set JWT_SECRET to a consistent value (don't change it!)

## Monitoring

Check Vercel logs for errors:
```bash
vercel logs
```

Or view in Vercel dashboard: Deployments > [Your Deployment] > Runtime Logs

## Database Management

View/edit database:
```bash
npx prisma studio
```

Run migrations:
```bash
npx prisma migrate dev
npx prisma db push  # for prod without migration files
```

## Support

If you encounter issues:
1. Check Vercel runtime logs
2. Verify all environment variables are set
3. Check database connectivity from Vercel
4. Ensure JWT_SECRET is properly set and not the default value
