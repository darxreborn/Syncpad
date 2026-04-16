# SyncPad

Real-time synchronized notepad powered by Cloudflare Workers and Durable Objects.

## Features

- **Real-time sync** across multiple devices and tabs
- **Offline support** with localStorage fallback
- **Progressive Web App** - install on mobile and desktop
- **Mobile optimized** with touch-friendly native textarea
- **Desktop optimized** with Monaco Editor (VS Code's editor)
- **Code splitting** - mobile users get smaller bundle
- **Content validation** - 1 MB size limit with visual warnings
- **History** - auto-save snippets with summaries
- **Dark mode** - follows system preference
- **No database required** - uses Cloudflare Durable Objects

## Quick Start

### Development

\`\`\`bash
# Install dependencies
npm install

# Start dev server (Vite)
npm run dev
\`\`\`

Visit \`http://localhost:5173\`

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

\`\`\`bash
# Build and deploy to Cloudflare
npm run deploy
\`\`\`

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Editor**: Monaco Editor (desktop) / Native textarea (mobile)
- **Styling**: Tailwind CSS v4
- **Build**: Vite 8
- **Backend**: Cloudflare Workers + Durable Objects
- **Sync**: WebSocket with broadcast pattern
- **Offline**: localStorage + Service Worker

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 12+)
- **Mobile browsers**: Optimized with native textarea

## Performance

- **Initial load**: ~60 kB gzipped (mobile) / ~65 kB (desktop)
- **Time to interactive**: < 1s on 3G
- **Real-time sync latency**: 10-50ms (same region)
- **Offline**: Instant (localStorage)

## Size Limits

- **Content**: 1 MB (Durable Objects WebSocket limit)
- **History**: 50 snippets max
- **Bundle**: 169 kB uncompressed, 55 kB gzipped

## Credits

Built with React, Vite, Cloudflare Workers, Monaco Editor, and Tailwind CSS.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.
