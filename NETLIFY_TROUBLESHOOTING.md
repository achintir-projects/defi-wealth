# Netlify Deployment Troubleshooting

## Current Issues Fixed

### 1. Database Path Configuration
**Problem**: Netlify functions were using incorrect database path
**Solution**: Updated all functions to use `file:./prisma/db/custom.db`

### 2. Missing Database Files in Deployment
**Problem**: Database files were not included in Netlify deployment
**Solution**: Updated `netlify.toml` to include both `db/**/*` and `prisma/db/**/*`

## Files Modified

### netlify.toml
- Added `prisma/db/**/*` to included_files
- Ensures database files are available in serverless environment

### Netlify Functions (12 files)
All functions updated with correct database path:
- `admin-inject.js`
- `admin-refresh-prices.js`
- `admin-wallets-detail.js`
- `admin-wallets.js`
- `admin.js`
- `health.js`
- `init-db.js`
- `init-demo.js`
- `portfolio.js`
- `transfers.js`
- `trending.js`
- `wallet.js`

## Deployment Status

### Latest Commit
- **Hash**: `ab22b46`
- **Message**: "Fix Netlify database path configuration"
- **Status**: ✅ Pushed to GitHub

### Expected Behavior After Deployment
1. **Database Initialization**: Functions will automatically create admin user and default tokens
2. **Wallet Creation**: New users will get default tokens automatically
3. **Token Injection**: Admin injection functionality will work properly
4. **Portfolio Display**: Users will see their token balances correctly

## Manual Initialization

If automatic initialization doesn't work, manually trigger:

### 1. Initialize Database
```bash
curl -X POST https://defi-wealth.netlify.app/api/init-db
```

### 2. Create Demo User
```bash
curl -X POST https://defi-wealth.netlify.app/api/init-demo
```

### 3. Test Wallet Function
```bash
curl https://defi-wealth.netlify.app/api/wallet?address=0x1234567890123456789012345678901234567890
```

## Debugging Steps

### 1. Check Function Logs
- Go to Netlify dashboard
- Navigate to Functions tab
- Check logs for each function

### 2. Verify Database Path
- Ensure `prisma/db/custom.db` is accessible
- Check file permissions

### 3. Test Individual Functions
```bash
# Health check
curl https://defi-wealth.netlify.app/api/health

# Database initialization
curl https://defi-wealth.netlify.app/api/init-db

# Wallet with test address
curl https://defi-wealth.netlify.app/api/wallet?address=0x1234567890123456789012345678901234567890
```

## Common Issues

### 1. Database Not Found
- **Symptom**: Functions return empty data
- **Solution**: Ensure database files are included in deployment

### 2. Permission Issues
- **Symptom**: Functions can't write to database
- **Solution**: Check file permissions in Netlify environment

### 3. Missing Environment Variables
- **Symptom**: Database connection fails
- **Solution**: Set DATABASE_URL in Netlify environment variables

## Expected Response After Fix

### Wallet API Response
```json
{
  "totalValue": 123456.78,
  "totalChange24h": 2.5,
  "tokens": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "logo": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      "balance": 2.5,
      "price": 45000,
      "value": 112500,
      "change24h": 1.2,
      "decimals": 8
    }
    // ... more tokens
  ],
  "user": {
    "role": "USER",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }
}
```

### Admin Injection Response
```json
{
  "message": "Token injection completed successfully",
  "injection": {
    "toWallet": "0x1234567890123456789012345678901234567890",
    "tokenSymbol": "ETH",
    "amount": 10,
    "txHash": "0x...",
    "injectedBy": "admin-user-id",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Next Steps

1. **Wait for Deployment**: Netlify deployment may take 5-10 minutes
2. **Test Functions**: Use the curl commands above to verify functionality
3. **Check Logs**: Monitor Netlify function logs for any errors
4. **Monitor Performance**: Ensure functions are responding within timeout limits

## Support

If issues persist:
1. Check Netlify deployment logs
2. Verify GitHub Actions completed successfully
3. Ensure all environment variables are set correctly
4. Contact support with deployment details