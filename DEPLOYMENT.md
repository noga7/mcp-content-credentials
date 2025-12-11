# Deployment Guide

Deploy your MCP Content Credentials server to a permanent public URL.

## Option 1: Render.com (Recommended - Free Tier)

### Prerequisites
- GitHub account
- Render.com account (free)

### Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [https://render.com](https://render.com)
   - Sign in with GitHub
   - Click **"New +"** → **"Web Service"**

3. **Configure the deployment**
   - Select your `mcp-content-credentials` repository
   - Render will auto-detect the `render.yaml` configuration
   - Click **"Apply"**

4. **Wait for deployment**
   - First build takes ~5-10 minutes (installs c2patool + TrustMark)
   - You'll get a URL like: `https://mcp-content-credentials.onrender.com`

5. **Update ChatGPT**
   - Go to ChatGPT → Settings → Apps & Connectors → Your App → Edit
   - Change MCP Server URL to: `https://your-app.onrender.com/mcp`

### Free Tier Limitations
- ⚠️ **Server spins down after 15 minutes of inactivity**
- First request after spin-down takes ~30-60 seconds
- 750 hours/month free (roughly 31 days)

### Keep server awake (optional)
Add a cron job to ping your server every 10 minutes:
- Use [cron-job.org](https://cron-job.org) (free)
- URL: `https://your-app.onrender.com/health`
- Schedule: Every 10 minutes

---

## Option 2: Railway (Recommended - $5/month)

### Prerequisites
- GitHub account
- Railway account

### Steps

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Add a domain**
   ```bash
   railway domain
   ```

4. **Get your URL**
   - Railway will provide: `https://your-app.up.railway.app`
   - Use: `https://your-app.up.railway.app/mcp` in ChatGPT

### Pricing
- $5/month for hobby plan
- Always-on (no spin-down)
- Better performance than free tiers

---

## Option 3: Docker (Self-hosted or Cloud)

### Deploy with Docker

1. **Build the image**
   ```bash
   docker build -t mcp-content-credentials .
   ```

2. **Run locally**
   ```bash
   docker run -p 3001:3001 mcp-content-credentials
   ```

3. **Deploy to any cloud**
   - **Google Cloud Run**: `gcloud run deploy`
   - **AWS ECS**: Push to ECR and deploy
   - **Azure Container Apps**: `az containerapp create`
   - **DigitalOcean App Platform**: Connect GitHub repo

### Docker Hub (for easy deployment)

1. **Push to Docker Hub**
   ```bash
   docker tag mcp-content-credentials yourusername/mcp-content-credentials
   docker push yourusername/mcp-content-credentials
   ```

2. **Deploy anywhere that supports Docker**

---

## Option 4: Heroku

### Prerequisites
- Heroku account
- Heroku CLI installed

### Steps

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create app**
   ```bash
   heroku create your-mcp-server
   ```

3. **Add buildpacks**
   ```bash
   heroku buildpacks:add heroku/nodejs
   heroku buildpacks:add heroku/python
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Your URL**
   - `https://your-mcp-server.herokuapp.com/mcp`

### Pricing
- Free tier discontinued
- Starts at $7/month for Eco plan

---

## Environment Variables

All platforms support environment variables. Set these if needed:

```bash
NODE_ENV=production        # Set to production
MCP_PORT=3001             # Port (usually auto-set by platform)
LOG_LEVEL=info            # info, debug, warn, error
```

---

## Post-Deployment Checklist

### 1. Test your deployment
```bash
# Health check
curl https://your-url.com/health

# Should return:
# {"status":"ok","service":"mcp-content-credentials",...}
```

### 2. Test the MCP endpoint
```bash
curl -N -H "Accept: text/event-stream" https://your-url.com/mcp
```

### 3. Update ChatGPT App
- Go to ChatGPT → Settings → Apps & Connectors
- Edit your app
- Change MCP Server URL to: `https://your-url.com/mcp`

### 4. Test with ChatGPT
Ask: "Check this image: https://example.com/image.jpg"

---

## Troubleshooting

### Build fails - c2patool installation
**Render/Railway**: Should auto-install via `scripts/install-trustmark.cjs`

**Fix**: Check logs for Python or c2patool errors
```bash
# Render: View logs in dashboard
# Railway: railway logs
```

### Server starts but /mcp times out
- Check if port is correct (should be 3001)
- Verify health endpoint works: `/health`
- Check server logs for errors

### ChatGPT says "Server not found"
- Make sure URL ends with `/mcp`
- Verify server is running (check health endpoint)
- Try reconnecting the app in ChatGPT

### High latency / slow responses
- Free tiers have cold starts (30-60s on first request)
- Consider paid plans for always-on servers
- Use keep-alive cron jobs for free tiers

---

## Monitoring

### Render Dashboard
- View logs: Dashboard → Service → Logs
- Monitor uptime: Dashboard → Metrics

### Railway Dashboard
- Logs: `railway logs`
- Metrics: Railway dashboard

### Health Check Monitoring
Use **UptimeRobot** (free) to monitor your server:
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: `https://your-url.com/health`
3. Get alerts if server goes down

---

## Cost Comparison

| Platform | Free Tier | Paid | Always-On | Cold Start |
|----------|-----------|------|-----------|------------|
| **Render** | ✅ 750h/mo | $7/mo | ❌ | 30-60s |
| **Railway** | ❌ | $5/mo | ✅ | No |
| **Heroku** | ❌ | $7/mo | ✅ | No |
| **Fly.io** | ✅ Limited | $5/mo | Depends | Varies |

**Recommendation**: 
- **Testing/Personal**: Render free tier
- **Production**: Railway ($5/mo)

---

## Need Help?

- Check server logs first
- Test `/health` endpoint
- Verify ngrok still works locally (to rule out code issues)
- Check platform-specific documentation

## Security Notes

- Server only accepts URL-based verification (no file uploads)
- CORS enabled for all origins (consider restricting in production)
- No authentication by default (consider adding for production use)
- All verification is read-only
