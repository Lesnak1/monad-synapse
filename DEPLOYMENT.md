# 🚀 Monad Synapse Casino - Vercel Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Security Requirements
- [ ] All private keys removed from codebase
- [ ] Environment variables configured in Vercel dashboard
- [ ] Database paths set to `/tmp` for Vercel
- [ ] CORS origins configured for production domain
- [ ] Security headers enabled in middleware

### ✅ Environment Variables (OPTIONAL - Has Secure Fallbacks)

#### 🚀 **GOOD NEWS: Project works WITHOUT any environment variables!**
All critical values have secure fallbacks. Set only what you need:

#### 🔐 Optional Security Variables (Recommended for Production)
```bash
# Authentication (fallback: auto-generated secure keys)
NEXTAUTH_SECRET=your-super-secret-jwt-key-min-32-chars

# Blockchain (fallback: demo mode with mock transactions)
NEXT_PUBLIC_POOL_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
CASINO_OPERATOR_PRIVATE_KEY=your-secure-private-key-server-only

# WalletConnect (fallback: demo mode)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

#### 📊 Optional Monitoring
```bash
# Analytics (optional)
VERCEL_ANALYTICS_ID=your-vercel-analytics-id
SENTRY_DSN=your-sentry-dsn
```

#### 💡 **Quick Deploy:** 
For testing: Skip all environment variables - project works immediately!
For production: Add only the variables you need

## 🛠️ Deployment Steps

### 1. GitHub Repository Setup
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: Monad Synapse Casino"

# Add GitHub remote (replace with your repo)
git remote add origin https://github.com/Lesnak1/monad-synapse.git
git branch -M main
git push -u origin main
```

### 2. Vercel Dashboard Configuration

1. **Import GitHub Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub: `Lesnak1/monad-synapse`

2. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Root Directory: apps/web
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`

4. **Domain Settings**
   - Configure custom domain if desired
   - Enable HTTPS (automatic in Vercel)

### 3. Security Configuration

#### 🔒 Environment Variables Security
- **Production**: Set in Vercel Dashboard only
- **Never commit**: Any `.env` files to Git
- **Rotation**: Change keys regularly

#### 🛡️ Wallet Security
- Pool wallet private key: Server-side only
- Use hardware wallet for large funds
- Monitor transactions with alerts

#### 📊 Monitoring Setup
```bash
# Optional: Add monitoring services
SENTRY_DSN=your-sentry-dsn
VERCEL_ANALYTICS_ID=your-analytics-id
```

## 🔧 Production Optimizations

### Performance
- ✅ Turbopack enabled for faster builds
- ✅ SWC minification for smaller bundles
- ✅ Image optimization configured
- ✅ Compression enabled

### Security
- ✅ Security headers in middleware
- ✅ Rate limiting active
- ✅ CSRF protection enabled
- ✅ CSP with Web3 wallet support

### Monitoring
- ✅ Error tracking ready
- ✅ Performance metrics enabled
- ✅ Security alerts configured

## 📝 Deployment Commands

```bash
# Manual deployment (if needed)
npm install -g vercel
vercel --prod

# Auto-deployment via GitHub
git push origin main  # Triggers automatic deployment
```

## 🚨 Security Checklist

### Before Going Live
- [ ] Private keys secured and rotated
- [ ] Environment variables set in Vercel
- [ ] Database backups configured
- [ ] Monitoring alerts active
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting tested
- [ ] CORS configuration verified

### Post-Deployment
- [ ] Test all game functionality
- [ ] Verify wallet connections
- [ ] Check API endpoints
- [ ] Monitor error logs
- [ ] Test bet refund system
- [ ] Verify security headers

## 🔍 Troubleshooting

### Common Issues
1. **Build Failures**: Check TypeScript/ESLint errors
2. **Environment Variables**: Ensure all required vars are set
3. **CORS Errors**: Update allowed origins
4. **Wallet Connection**: Verify WalletConnect config

### Debug Commands
```bash
# Check build locally
npm run build

# Test production build
npm run start

# Check environment variables
echo $NODE_ENV
```

## 📞 Support

- **Documentation**: [Next.js](https://nextjs.org/docs)
- **Deployment**: [Vercel Docs](https://vercel.com/docs)
- **Web3**: [Wagmi Docs](https://wagmi.sh)

---

**⚠️ SECURITY WARNING**: Never commit private keys, passwords, or sensitive data to Git. Always use environment variables for production secrets.