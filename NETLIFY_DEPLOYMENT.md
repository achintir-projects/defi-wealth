# Netlify Deployment Guide with Neon Database

## Overview

This guide explains how to deploy the DeFi Wealth Management application to Netlify using Neon as the production database. Neon is a serverless PostgreSQL database that works perfectly with Netlify's serverless functions.

## Prerequisites

1. **Neon Database Account**: Sign up at [Neon](https://neon.tech)
2. **Netlify Account**: Sign up at [Netlify](https://netlify.com)
3. **GitHub Repository**: Your code should be in a GitHub repository

## Step 1: Set Up Neon Database

1. **Create a Neon Project**:
   - Log in to your Neon dashboard
   - Click "New Project"
   - Choose a region close to your users
   - Give your project a name (e.g., `defi-wealth-db`)
   - Click "Create Project"

2. **Get Database Connection String**:
   - Once the project is created, go to the Dashboard
   - Click on "Connection Details"
   - Copy the connection string (it looks like: `postgresql://username:password@host.neon.tech/dbname?sslmode=require`)

3. **Set Up Database Schema**:
   - The Prisma schema will automatically create the tables when the application first connects
   - Alternatively, you can run the migration locally and push to Neon:
   ```bash
   # Update your .env with the Neon connection string
   DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
   
   # Push the schema to Neon
   npm run db:push
   
   # Seed the database with initial data
   npm run db:seed
   ```

## Step 2: Configure Netlify

1. **Connect Your GitHub Repository**:
   - Log in to Netlify
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account
   - Select your repository
   - Click "Deploy site"

2. **Set Environment Variables**:
   - Go to Site settings → Build & deploy → Environment
   - Add the following environment variables:
     - `DATABASE_URL`: Your Neon connection string
     - `NODE_ENV`: `production`

3. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `18` (or latest LTS)

## Step 3: Update Prisma Schema for Neon

The current Prisma schema is already compatible with Neon. However, you may want to add some Neon-specific optimizations:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Neon-specific configurations
  shadowDatabaseUrl? = env("SHADOW_DATABASE_URL")
}
```

## Step 4: Test the Deployment

1. **Deploy the Site**:
   - Netlify will automatically deploy when you push to GitHub
   - Or trigger a manual deploy from the Netlify dashboard

2. **Test the Application**:
   - Visit your Netlify URL
   - Test the wallet functionality
   - Test the admin panel:
     - Go to `/admin-login`
     - Use the admin password: `DeFiWealthSecure2024!@#$`
     - Test token injection functionality

3. **Verify Database Persistence**:
   - Inject some tokens to a wallet
   - Check that the injection history shows up
   - Refresh the page and verify that balances persist
   - Check that the wallet endpoint shows the correct balances

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Ensure your Neon database is active (not paused)
   - Verify the DATABASE_URL is correct and includes `?sslmode=require`
   - Check that your Neon IP allowlist includes Netlify's IP ranges

2. **Build Failures**:
   - Ensure all dependencies are properly installed
   - Check that the Prisma client is generated during build
   - Verify that the build command includes `npx prisma generate`

3. **Function Timeouts**:
   - Netlify functions have a 30-second timeout by default
   - For complex database operations, consider optimizing queries
   - Use connection pooling with Neon's PgBouncer

### Monitoring

1. **Netlify Logs**:
   - Check function logs in Netlify dashboard
   - Monitor build logs for errors

2. **Neon Dashboard**:
   - Monitor database performance
   - Check connection metrics
   - Set up alerts for high usage

## Best Practices

1. **Environment Variables**:
   - Never commit database credentials to git
   - Use Netlify's environment variables for sensitive data
   - Use different databases for development and production

2. **Database Optimization**:
   - Use Neon's connection pooling for better performance
   - Monitor query performance in Neon dashboard
   - Consider using read replicas for high-traffic applications

3. **Security**:
   - Enable SSL for all database connections
   - Use strong passwords for database users
   - Regularly rotate database credentials
   - Monitor for suspicious activity

## Backup and Recovery

1. **Neon Backups**:
   - Neon provides automated backups
   - You can create manual backups from the dashboard
   - Point-in-time recovery is available

2. **Export Data**:
   ```bash
   # Export data from Neon
   pg_dump $DATABASE_URL > backup.sql
   
   # Import data to Neon
   psql $DATABASE_URL < backup.sql
   ```

## Support

- **Neon Documentation**: https://neon.tech/docs
- **Netlify Documentation**: https://docs.netlify.com
- **Prisma Documentation**: https://www.prisma.io/docs

## Summary

By using Neon with Netlify, you get:
- ✅ Persistent database storage
- ✅ Serverless scalability
- ✅ Automatic backups
- ✅ Connection pooling
- ✅ SSL encryption
- ✅ Easy deployment

The application will work seamlessly in production with proper data persistence and all features functioning correctly.