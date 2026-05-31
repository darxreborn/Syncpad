# SyncPad Deployment Plan v2
## Revised April 16, 2026 - Post Opus Review

---

## Executive Summary

**Total Estimated Time:** 18-24 hours (revised from 12-18)  
**Critical Path:** Phase 1 → Phase 1B → Phase 5 → Phase 2+3 (parallel) → Phase 4  
**Highest Risk:** Tailwind CDN-to-build migration (now Phase 1B)

---

## Phase 1: Critical Bug Fixes & Cleanup
**Duration:** 2-3 hours | **Risk:** Low | **Model:** Sonnet 4.6

### Objectives
- Fix React hooks violations
- Remove Gemini AI integration
- Clean up version conflicts
- Establish stable baseline

### Tasks

#### 1.1 Fix React Hook Issues (App.tsx)
**File:** `App.tsx`

- [ ] Line 43-46: Fix stale closure using functional setState
```typescript
const unsubscribeStatus = syncService.subscribeStatus((isOnline) => {
  setStatus(prev => {
    if (!isOnline) return 'offline';
    if (prev === 'offline') return 'idle';
    return prev;
  });
});
```

- [ ] Line 48: Add timer cleanup in useEffect return
```typescript
return () => {
  unsubscribeContent();
  unsubscribeStatus();
  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
};
```

- [ ] Fix timeout leaks at lines 39, 65, 91, 98 (setStatus, setJustSaved, setJustCopied)
  - Store in refs and clean up on unmount

#### 1.2 Remove Gemini AI Integration
**Files:** Multiple

- [ ] Delete `services/geminiService.ts`
- [ ] Remove import from `App.tsx` (line 4)
- [ ] Remove `generateSnippetSummary` calls in `addToHistory` (lines 75-81)
- [ ] Add fallback summary: `content.substring(0, 40).trim() || "Snippet"`
- [ ] Remove `isAiGenerating` from `types.ts` Snippet interface
- [ ] Simplify HistoryDropdown.tsx (remove Sparkles animation logic)
- [ ] Remove `@google/generative-ai` from `package.json`
- [ ] Remove `define` block from `vite.config.ts` (lines 6-9)

#### 1.3 Fix Environment Variables
**File:** `services/syncService.ts`

- [ ] Line 76: Change `process.env.NODE_ENV` to `import.meta.env.DEV`

#### 1.4 Clean Up Version Conflicts
**Files:** `index.html`, `.gitignore`, root

- [ ] **CRITICAL:** Delete `importmap` block from `index.html` (lines 70-83)
  - Resolves React 18 vs React 19 conflict
- [ ] Add `dist/` to `.gitignore`
- [ ] Delete `dist/` from git: `git rm -r dist/`
- [ ] Choose one package manager: delete either `pnpm-lock.yaml` OR `package-lock.json`

#### 1.5 Update Wrangler Config
**File:** `wrangler.toml`

- [ ] Add `account_id = "ba0a3d371709ee38759a1ee2e652b428"` (line 2)
  - Note: Will be removed in Phase 5 for env var approach

### Testing Checklist
- [ ] `npm run build` succeeds
- [ ] `grep -r "process.env" --include="*.ts" --include="*.tsx"` returns only build-side usage
- [ ] `npm run dev` works without Gemini errors
- [ ] WebSocket connection works locally
- [ ] History saves without AI summaries
- [ ] No console errors on unmount (check timer cleanup)

### Model Justification
**Sonnet 4.6** - Fast, reliable for systematic refactoring and deletion. Low risk tasks.

---

## Phase 1B: Tailwind Migration (Infrastructure)
**Duration:** 3-4 hours | **Risk:** HIGH | **Model:** Opus 4.6

**⚠️ CRITICAL:** Moved from Phase 4 per Opus review. All subsequent phases depend on this.

### Objectives
- Migrate from CDN Tailwind to build-time Tailwind
- Preserve all custom classes and configurations
- Enable offline PWA support

### Tasks

#### 1B.1 Extract Tailwind Config
**File:** `index.html` → NEW: `tailwind.config.js`

- [ ] Copy custom config from `index.html` lines 9-29 to `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}", // For App.tsx, etc. at root
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        surface: '#ffffff',
        background: '#f8fafc',
        'dark-outer': '#1c1e20',
        'dark-inner': '#24292f',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
```

#### 1B.2 Setup PostCSS
**NEW FILES:** `postcss.config.js`, `src/index.css`

- [ ] Create `postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] Create `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] Import in `index.tsx`: `import './index.css';`

#### 1B.3 Remove CDN Script
**File:** `index.html`

- [ ] Remove `<script src="https://cdn.tailwindcss.com"></script>` (line 7)
- [ ] Remove inline `<script>tailwind.config = {...}</script>` block (lines 8-30)

#### 1B.4 Install Dependencies
**File:** `package.json`

- [ ] Add to devDependencies:
```json
"tailwindcss": "^3.4.1",
"autoprefixer": "^10.4.17",
"postcss": "^8.4.35"
```
- [ ] Run `npm install`

### Testing Checklist (CRITICAL - Visual Regression)

Create a manual test checklist for EVERY custom class:

**Colors:**
- [ ] `bg-dark-outer` renders correctly in dark mode
- [ ] `bg-dark-inner` renders correctly in dark mode
- [ ] `bg-background` renders correctly in light mode
- [ ] `bg-surface` renders correctly
- [ ] `text-primary` renders blue-600

**Fonts:**
- [ ] `font-sans` uses Inter
- [ ] `font-mono` uses Fira Code in editor

**Animations:**
- [ ] `animate-pulse-slow` works on loading indicators

**Dark Mode:**
- [ ] Toggle system dark mode, verify all `dark:` classes apply

**Production Build:**
- [ ] `npm run build` produces dist/ with purged CSS
- [ ] Deployed app looks identical to CDN version

### Rollback Plan
```bash
git revert <commit-hash>
npm install
```
Immediately redeploy previous version.

### Model Justification
**Opus 4.6** - Highest risk task requiring careful attention to detail. Opus excels at preserving exact functionality during complex migrations.

---

## Phase 2: Content Validation & Mobile Clipboard
**Duration:** 2-3 hours | **Risk:** Low-Medium | **Model:** Sonnet 4.6

### Objectives
- Prevent localStorage quota errors
- Ensure clipboard works on mobile

### Tasks

#### 2.1 Content Length Validation
**Files:** `constants.ts`, `services/syncService.ts`, `App.tsx`

- [ ] Add to `constants.ts`:
```typescript
export const MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB (Cloudflare DO WebSocket limit)
```

- [ ] Create `safeSetItem` method in `syncService.ts`:
```typescript
private safeSetItem(key: string, value: string): boolean {
  try {
    if (value.length > MAX_CONTENT_LENGTH) {
      console.warn('Content exceeds 1MB limit');
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded');
      return false;
    }
    throw e;
  }
}
```

- [ ] Replace `localStorage.setItem` calls in:
  - `broadcastUpdate` (line 113)
  - `saveToHistory` (line 143)
  - `ws.onmessage` (line 59)

- [ ] In `App.tsx`, show error if `saveContent` fails:
  - Set status to 'error' if safeSetItem returns false

#### 2.2 Mobile Clipboard Fallback
**File:** `App.tsx`

- [ ] Update `copyToClipboard` (line 93):
```typescript
const copyToClipboard = async () => {
  if (!content) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
    } else {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  } catch (err) { 
    console.error('Failed to copy!', err);
  }
};
```

### Testing Checklist
- [ ] Paste 2MB content, verify rejection message
- [ ] Test copy on iOS Safari (actual device)
- [ ] Test copy on Chrome Android
- [ ] Test paste on desktop Chrome
- [ ] Test in non-HTTPS context (http://localhost)

### Model Justification
**Sonnet 4.6** - Straightforward defensive coding with clear requirements.

---

## Phase 3: Mobile Editor Experience
**Duration:** 5-7 hours | **Risk:** HIGH | **Model:** Opus 4.6

### Objectives
- Make editor usable on mobile devices
- Proper keyboard handling
- Editor-only scrolling (not whole page)

### Tasks

#### 3.1 Mobile Detection Utility
**NEW FILE:** `utils/isMobile.ts`

- [ ] Create detection function:
```typescript
export const isMobile = (): boolean => {
  // Check pointer type (more reliable than userAgent)
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  
  // Check touch support
  const hasTouchScreen = 'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0;
  
  // Check screen size as secondary signal
  const isSmallScreen = window.innerWidth < 768;
  
  return hasCoarsePointer || (hasTouchScreen && isSmallScreen);
};
```

#### 3.2 Create Mobile Editor Component
**NEW FILE:** `components/MobileEditor.tsx`

- [ ] Build textarea-based editor:
```typescript
import React, { useRef, useEffect } from 'react';

interface MobileEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export const MobileEditor: React.FC<MobileEditorProps> = ({ 
  value, 
  onChange, 
  onBlur 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full h-full p-4 resize-none focus:outline-none bg-transparent"
        style={{
          fontSize: '16px', // Prevent iOS auto-zoom
          fontFamily: "'Fira Code', monospace",
          touchAction: 'manipulation', // Prevent double-tap zoom
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch', // Native momentum scrolling
        }}
        placeholder="Start typing..."
      />
    </div>
  );
};
```

#### 3.3 Lazy-Load Monaco Editor
**File:** `components/Editor.tsx`

- [ ] Use React.lazy to avoid loading Monaco on mobile:
```typescript
import React, { lazy, Suspense } from 'react';
import { isMobile } from '../utils/isMobile';
import { MobileEditor } from './MobileEditor';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export const Editor: React.FC<EditorProps> = ({ value, onChange, onBlur }) => {
  const isDarkMode = /* ... */;

  if (isMobile()) {
    return <MobileEditor value={value} onChange={onChange} onBlur={onBlur} />;
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading editor...</div>}>
      <div className="flex h-full w-full overflow-hidden" onBlur={onBlur}>
        <MonacoEditor
          // ... existing props
        />
      </div>
    </Suspense>
  );
};
```

#### 3.4 Visual Viewport Hook
**NEW FILE:** `hooks/useVisualViewport.ts`

- [ ] Create hook for keyboard handling:
```typescript
import { useState, useEffect } from 'react';

export function useVisualViewport() {
  const [height, setHeight] = useState(() => 
    window.visualViewport?.height || window.innerHeight
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      setHeight(vv.height);
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  return height;
}
```

#### 3.5 Update App Layout
**File:** `App.tsx`

- [ ] Import and use visual viewport hook:
```typescript
import { useVisualViewport } from './hooks/useVisualViewport';

const App: React.FC = () => {
  const viewportHeight = useVisualViewport();
  
  return (
    <div 
      className="overflow-hidden bg-background dark:bg-dark-outer text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300"
      style={{ height: `${viewportHeight}px` }}
    >
      {/* ... rest of app */}
    </div>
  );
};
```

#### 3.6 Update Viewport Meta
**File:** `index.html`

- [ ] Update meta tag (⚠️ Accessibility concern noted):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
```
**Note:** Using `user-scalable=yes` with `maximum-scale=5.0` instead of `user-scalable=no` for better accessibility.

### Testing Checklist
**Desktop:**
- [ ] Monaco loads and works normally
- [ ] No mobile bundle downloaded (check Network tab)

**iOS Safari (iPhone):**
- [ ] Tap editor, keyboard opens smoothly
- [ ] Type text, no lag
- [ ] Scroll within editor (not page)
- [ ] Keyboard dismisses when tapping outside
- [ ] No auto-zoom on focus
- [ ] Rotate device, layout adjusts

**Chrome Android:**
- [ ] Same tests as iOS

**iPad:**
- [ ] Should use MobileEditor (touch device)
- [ ] Apple Pencil input works if available

### Model Justification
**Opus 4.6** - Complex mobile UX requiring careful handling of viewport, keyboard, and touch interactions. High risk of subtle bugs.

---

## Phase 4: PWA Support
**Duration:** 3-4 hours | **Risk:** Medium | **Model:** Haiku 4.5

### Objectives
- Make app installable
- Offline support
- Native app-like experience

### Tasks

#### 4.1 Create Manifest
**NEW FILE:** `public/manifest.json`

- [ ] Create web app manifest:
```json
{
  "name": "SyncPad",
  "short_name": "SyncPad",
  "description": "Real-time collaborative notepad",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#1c1e20",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

#### 4.2 Generate App Icons
**NEW DIRECTORY:** `public/icons/`

- [ ] Create icons from logo (black square with white "S"):
  - `icon-192.png` (192x192)
  - `icon-512.png` (512x512)
  - `icon-maskable-512.png` (512x512 with safe zone)

#### 4.3 Create Service Worker
**NEW FILE:** `public/sw.js`

- [ ] Implement **network-first** strategy (NOT cache-first per Opus review):
```javascript
const CACHE_NAME = 'syncpad-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // CRITICAL: Do not intercept WebSocket upgrade requests
  if (request.headers.get('Upgrade') === 'websocket') {
    return;
  }
  
  // Do not cache API calls
  if (request.url.includes('/api/')) {
    return;
  }

  // Network-first for documents/scripts, cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(request);
      })
  );
});
```

#### 4.4 Update index.html
**File:** `index.html`

- [ ] Add to `<head>`:
```html
<!-- PWA -->
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1c1e20" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />

<!-- iOS -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

#### 4.5 Register Service Worker
**File:** `index.tsx`

- [ ] Add after ReactDOM.render:
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW registration failed:', err));
  });
}
```

#### 4.6 Bundle Google Fonts
**File:** `index.html`, `src/index.css`

- [ ] Remove Google Fonts CDN link (line 31)
- [ ] Add fonts to project or use `fontsource`:
```bash
npm install @fontsource/inter @fontsource/fira-code
```
- [ ] Import in `index.css`:
```css
@import '@fontsource/inter/300.css';
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/fira-code/400.css';
```

### Testing Checklist
- [ ] Run Lighthouse PWA audit → Score 100
- [ ] "Add to Home Screen" prompt appears (iOS Safari, Chrome Android)
- [ ] Install app, verify icon and splash screen
- [ ] Open installed app, looks like standalone
- [ ] Go offline (airplane mode), reload → cached version loads
- [ ] WebSocket still attempts connection when back online
- [ ] Service worker updates properly on redeploy

### Model Justification
**Haiku 4.5** - Well-defined PWA patterns, straightforward implementation. Fast and cost-effective.

---

## Phase 5: GitHub Actions CI/CD
**Duration:** 2-3 hours | **Risk:** Low-Medium | **Model:** Sonnet 4.6

### Objectives
- Automated deployment on push to main
- Type checking and Lighthouse CI

### Tasks

#### 5.1 Create Workflow File
**NEW FILE:** `.github/workflows/deploy.yml`

- [ ] Create GitHub Actions workflow:
```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

#### 5.2 Configure GitHub Secrets
**GitHub Repo Settings → Secrets**

- [ ] Add `CLOUDFLARE_API_TOKEN`
  - Get from: Cloudflare Dashboard → My Profile → API Tokens
  - Permissions: Workers Scripts:Edit
- [ ] Add `CLOUDFLARE_ACCOUNT_ID`
  - Value: `ba0a3d371709ee38759a1ee2e652b428`

#### 5.3 Update Wrangler Config
**File:** `wrangler.toml`

- [ ] Remove hardcoded `account_id` (added in Phase 1)
- [ ] Add comment:
```toml
# account_id is provided via CLOUDFLARE_ACCOUNT_ID env var in CI
# For local deploys, use: wrangler login
```

#### 5.4 Add Health Check Endpoint (Optional)
**File:** `worker.ts`

- [ ] Add health check route:
```typescript
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ... existing routes
  }
};
```

### Testing Checklist
- [ ] Push to feature branch, manually trigger workflow
- [ ] Verify build succeeds
- [ ] Verify type check passes
- [ ] Verify Lighthouse audit runs
- [ ] Verify deployment succeeds
- [ ] Push to main, verify automatic deployment
- [ ] Check deployed app at syncpad.devokstore.workers.dev
- [ ] Test rollback: `wrangler rollback` from CLI

### Model Justification
**Sonnet 4.6** - DevOps automation with clear requirements and standard patterns.

---

## Model Allocation Summary

| Phase | Model | Rationale |
|-------|-------|-----------|
| **1: Bug Fixes** | Sonnet 4.6 | Fast, reliable, systematic refactoring |
| **1B: Tailwind Migration** | Opus 4.6 | Highest risk, requires precision and attention to detail |
| **2: Validation & Clipboard** | Sonnet 4.6 | Straightforward defensive coding |
| **3: Mobile Editor** | Opus 4.6 | Complex mobile UX, high risk of subtle bugs |
| **4: PWA** | Haiku 4.5 | Well-defined patterns, cost-effective |
| **5: CI/CD** | Sonnet 4.6 | Standard DevOps patterns |

**Cost Optimization:**
- Opus 4.6: 2 phases (highest risk items)
- Sonnet 4.6: 3 phases (majority of work)
- Haiku 4.5: 1 phase (well-defined, low risk)

---

## Critical Issues Addressed from Opus Review

✅ **React version conflict** - Fixed in Phase 1.4  
✅ **Tailwind migration** - Moved to Phase 1B (was Phase 4)  
✅ **Content size limit** - Changed to 1MB (was 4MB) in Phase 2  
✅ **Service worker strategy** - Changed to network-first (was cache-first) in Phase 4  
✅ **WebSocket passthrough** - Explicitly added to SW in Phase 4  
✅ **Monaco lazy loading** - Added in Phase 3 to avoid 2-3MB mobile download  
✅ **Timeout leaks** - Added cleanup for all 5 timeout sources in Phase 1  
✅ **dist/ in git** - Cleanup in Phase 1.4  
✅ **Package manager conflict** - Choose one in Phase 1.4  
✅ **Google Fonts offline** - Bundle fonts in Phase 4.6  
✅ **Testing strategy** - Added manual checklists and Lighthouse CI  
✅ **Summary fallback** - Added substring fallback when removing Gemini  

---

## Risk Mitigation Strategies

### Tailwind Migration (Highest Risk)
- Manual test checklist for every custom class
- Side-by-side comparison (CDN vs build)
- Immediate rollback plan
- Use Opus 4.6 for precision

### Service Worker Conflicts
- Explicit WebSocket upgrade check
- API path exclusion
- Network-first strategy prevents stale code
- Health check endpoint for monitoring

### Mobile Detection False Positives
- Use `pointer: coarse` as primary signal
- Multiple fallbacks (touch support, screen size)
- User override toggle (future enhancement)

### Cloudflare DO WebSocket Limits
- 1MB message size limit enforced client-side
- Graceful degradation on rejection
- Error surfaced to user in status indicator

---

## Dependencies Graph (Revised)

```
Phase 1 (Bug Fixes)
  ↓
Phase 1B (Tailwind Migration) ← CRITICAL PATH
  ↓
Phase 5 (CI/CD) ← Enables automated testing
  ↓
  ├→ Phase 2 (Validation & Clipboard)
  └→ Phase 3 (Mobile Editor)
       ↓
Phase 4 (PWA)
```

**Phases 2 and 3 can run in parallel after Phase 5 CI/CD is active.**

---

## Post-Deployment Validation

### Smoke Test Checklist
After each phase deployment:

**Phase 1:**
- [ ] App loads without errors
- [ ] WebSocket connects
- [ ] History saves without Gemini
- [ ] No memory leaks on unmount

**Phase 1B:**
- [ ] All custom colors render correctly
- [ ] Dark mode toggle works
- [ ] Fonts load (Inter, Fira Code)
- [ ] No missing Tailwind classes

**Phase 2:**
- [ ] 2MB content rejected gracefully
- [ ] Copy works on iOS Safari
- [ ] Copy works on Chrome Android

**Phase 3:**
- [ ] Mobile users get textarea
- [ ] Desktop users get Monaco
- [ ] Keyboard opens smoothly on mobile
- [ ] Editor scrolls, page doesn't

**Phase 4:**
- [ ] Lighthouse PWA score = 100
- [ ] "Add to Home Screen" works
- [ ] Offline reload loads cached version
- [ ] WebSocket reconnects when online

**Phase 5:**
- [ ] Push to main triggers deploy
- [ ] Build passes all checks
- [ ] Deployed app works correctly

---

## Rollback Procedures

### Immediate Rollback (Any Phase)
```bash
# Option 1: Git revert
git revert <commit-hash>
git push origin main
# CI will auto-deploy reverted version

# Option 2: Cloudflare rollback
wrangler rollback
# Or use Cloudflare dashboard to rollback to previous deployment
```

### Targeted Rollback
- Phase 1-2: Low risk, git revert sufficient
- Phase 1B (Tailwind): Revert immediately if any visual issues
- Phase 3: Fallback to Monaco-only for all users
- Phase 4: Unregister service worker, remove manifest
- Phase 5: Disable workflow, manual deploys

---

## Success Criteria

### Phase 1
- Zero React warnings in console
- No Gemini errors
- Clean git history (no dist/ or lock file conflicts)

### Phase 1B
- Bit-perfect visual match to CDN version
- Production bundle size < 500KB
- Zero missing Tailwind classes

### Phase 2
- Content validation working
- Mobile clipboard 100% success rate

### Phase 3
- Mobile: 60fps scrolling, no lag
- Desktop: Monaco loads as before
- Bundle size savings: 2-3MB for mobile

### Phase 4
- Lighthouse PWA score: 100
- Installable on iOS and Android
- Offline functionality works

### Phase 5
- CI runs in < 5 minutes
- Zero failed deploys
- Type check catches errors

---

## Timeline Estimate

| Phase | Duration | Blocker? | Start After |
|-------|----------|----------|-------------|
| 1 | 2-3 hours | Yes | — |
| 1B | 3-4 hours | **YES (CRITICAL)** | Phase 1 |
| 5 | 2-3 hours | Recommended | Phase 1B |
| 2 | 2-3 hours | No | Phase 5 |
| 3 | 5-7 hours | No | Phase 5 |
| 4 | 3-4 hours | No | Phase 3 |

**Total:** 18-24 hours

**Recommended Schedule:**
- Day 1: Phase 1 + Phase 1B (5-7 hours) ← Foundation
- Day 2: Phase 5 + Phase 2 (4-6 hours) ← Automation + Safety
- Day 3: Phase 3 (5-7 hours) ← Mobile UX
- Day 4: Phase 4 (3-4 hours) ← PWA finishing

---

## Notes for Implementation

1. **Always test on actual devices**, not just browser DevTools mobile emulation
2. **Take screenshots before Tailwind migration** for comparison
3. **Monitor Cloudflare Workers metrics** after each deploy
4. **Keep Phase 1B commit separate** for easy rollback
5. **Use feature flags** if doing A/B testing of mobile editor

---

## Questions for User

Before starting implementation:

1. **Package manager preference?** Delete pnpm-lock.yaml or package-lock.json?
2. **Icon design preference?** Simple "S" logo or custom design?
3. **Mobile editor features?** Any syntax highlighting needed, or plain textarea OK?
4. **Conflict resolution strategy?** Last-write-wins acceptable or need CRDT?
5. **Analytics?** Should we add usage tracking for mobile vs desktop?

---

**Plan Status:** ✅ Reviewed by Opus 4.6  
**Ready to Implement:** Yes  
**Next Step:** Execute Phase 1
