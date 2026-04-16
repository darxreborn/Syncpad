# SyncPad Deployment Guide

## Prerequisites

1. **Cloudflare Account** (free plan works)
   - Sign up at https://dash.cloudflare.com/sign-up

2. **Node.js & npm** (v18 or later)
   ```bash
   node --version  # Should be v18+
   npm --version
   ```

3. **Wrangler CLI** (already in devDependencies)
   ```bash
   npx wrangler --version
   ```

## Step 1: Get Your Cloudflare Account ID

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select any website (or Workers & Pages)
3. Look for "Account ID" in the right sidebar
4. Copy the account ID (format: `abc123def456...`)

## Step 2: Configure wrangler.toml

Add your account ID to `wrangler.toml`:

```toml
name = "syncpad"
main = "worker.ts"
compatibility_date = "2024-09-23"
account_id = "YOUR_ACCOUNT_ID_HERE"  # ← Add this line

# Rest of configuration...
```

## Step 3: Authenticate Wrangler

First-time setup (opens browser for OAuth):

```bash
npx wrangler login
```

To check authentication:

```bash
npx wrangler whoami
```

## Step 4: Deploy to Cloudflare

### Development Preview

Test with a temporary preview URL (no changes to production):

```bash
npm run build
npx wrangler dev
```

Visit `http://localhost:8787` to test locally.

### Production Deployment

Deploy to production:

```bash
npm run deploy
```

This runs:
1. `npm run build` - Builds the React app
2. `wrangler deploy` - Deploys worker + assets to Cloudflare

Your app will be live at: `https://syncpad.YOUR_SUBDOMAIN.workers.dev`

## Step 5: Verify Deployment

1. **Open the URL** in your browser
2. **Check real-time sync**:
   - Open the same URL in another tab/device
   - Type in one tab → should appear in the other instantly
3. **Test mobile installation**:
   - iOS: Share → "Add to Home Screen"
   - Android: Menu → "Install App" or "Add to Home Screen"
   - Desktop: Look for install icon in address bar

## Common Issues

### Issue: "No account_id found"

**Solution**: Add `account_id` to `wrangler.toml` (see Step 2)

### Issue: "Authentication required"

**Solution**: Run `npx wrangler login`

### Issue: "Failed to publish"

**Possible causes**:
1. Build failed - run `npm run build` first
2. Account ID wrong - check Cloudflare dashboard
3. Network issue - try again

### Issue: WebSocket not connecting

**Possible causes**:
1. Worker not deployed - check `wrangler deploy` output
2. Durable Object not migrated - should auto-migrate on first deploy
3. Browser caching old version - hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

### Issue: App not installable

**Requirements for PWA installation**:
- Must be served over HTTPS (Cloudflare does this automatically)
- manifest.json must be valid
- Service worker must be registered
- User must visit the site at least once

**Check**:
1. Open DevTools → Application → Manifest
2. Verify no errors shown
3. Check "Service Workers" tab

## Production Checklist

- [ ] Account ID added to wrangler.toml
- [ ] Authenticated with `wrangler login`
- [ ] Built successfully with `npm run build`
- [ ] Deployed successfully with `npm run deploy`
- [ ] Opened deployment URL and verified app loads
- [ ] Tested real-time sync across tabs/devices
- [ ] Tested PWA installation
- [ ] Checked that offline mode works (disconnect wifi → app still loads)

## Custom Domain (Optional)

To use a custom domain like `syncpad.yourdomain.com`:

1. Add domain to Cloudflare (free plan)
2. Update `wrangler.toml`:
   ```toml
   [route]
   pattern = "syncpad.yourdomain.com"
   ```
3. Deploy: `npm run deploy`
4. DNS propagation may take 5-10 minutes

## Monitoring & Logs

View logs in real-time:

```bash
npx wrangler tail
```

View in dashboard:
- https://dash.cloudflare.com
- Workers & Pages → syncpad → Logs

## Rollback

To rollback to a previous version:

1. Go to Cloudflare Dashboard → Workers & Pages → syncpad
2. Click "Deployments" tab
3. Find previous deployment
4. Click "..." → "Rollback to this deployment"

## Environment Variables

SyncPad doesn't require any environment variables. All configuration is in the code.

## Troubleshooting Durable Objects

If sync stops working:

1. Check worker logs: `npx wrangler tail`
2. Verify Durable Object binding in `wrangler.toml`
3. Check migration applied: should see `v1` in dashboard
4. Test WebSocket: DevTools → Network → WS filter → should see `/api/sync`

## Performance Tips

- Durable Objects are regional - first user creates instance in their region
- Subsequent users connect to same instance (low latency within region)
- Cross-region sync may have 50-200ms latency
- Consider separate workers per region for large-scale apps

## Cost Estimate

**Free Plan** (plenty for personal/small team use):
- 100,000 requests/day
- 30 Durable Object namespaces
- 1 GB stored data
- 10 ms CPU time per request

**Paid Plan** ($5/month):
- 10M requests/month included
- $0.50 per million requests after
- Typically costs $5-10/month for moderate use

## Next Steps

1. **Generate proper icons**: See `public/ICONS_TODO.md`
2. **Custom domain**: Follow "Custom Domain" section above
3. **Monitoring**: Set up Cloudflare analytics
4. **Backup**: Consider exporting localStorage periodically

## Support

- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Durable Objects guide: https://developers.cloudflare.com/durable-objects/
- Community Discord: https://discord.gg/cloudflaredev
