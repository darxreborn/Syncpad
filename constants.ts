export const APP_TITLE = "SyncPad";
export const SYNC_CHANNEL_NAME = "syncpad_local_channel";
export const STORAGE_KEY_CURRENT = "syncpad_current_content";
export const STORAGE_KEY_HISTORY = "syncpad_history";
export const DEBOUNCE_DELAY_MS = 500;
export const MAX_HISTORY_ITEMS = 10;

// Cloudflare Durable Objects WebSocket message size limit
export const MAX_CONTENT_SIZE_BYTES = 1024 * 1024; // 1 MB
export const WARN_CONTENT_SIZE_BYTES = MAX_CONTENT_SIZE_BYTES * 0.8; // 80% of max (819.2 KB)
