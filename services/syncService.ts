import { STORAGE_KEY_CURRENT, STORAGE_KEY_HISTORY } from '../constants';
import { Snippet, PadMap } from '../types';

type ContentCallback = (content: PadMap) => void;
type StatusCallback = (isOnline: boolean) => void;

class SyncService {
  private ws: WebSocket | null = null;
  private contentCallbacks: ContentCallback[] = [];
  private statusCallbacks: StatusCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private isOnline = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (
      this.ws.readyState === WebSocket.OPEN ||
      this.ws.readyState === WebSocket.CONNECTING
    )) {
      return;
    }

    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';
    const host = window.location.host;

    if (!host || window.location.protocol === 'blob:' || window.location.protocol === 'file:') {
      console.warn("SyncService: Running in local/preview environment (blob/file). Real-time sync disabled.");
      this.isOnline = false;
      this.notifyStatus(false);
      return;
    }

    const wsUrl = `${wsProtocol}//${host}/api/sync`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      console.error("WebSocket connection failed to initialize", e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.isOnline = true;
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.notifyStatus(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE' && data.content) {
          localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(data.content));
          this.notifyContent(data.content);
        }
      } catch (e) {
        console.error("Sync message parse error", e);
      }
    };

    this.ws.onclose = () => {
      this.isOnline = false;
      this.notifyStatus(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = (e) => {
      if (import.meta.env.DEV) {
        console.log("WebSocket error (expected if worker not running locally):", e);
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public subscribe(callback: ContentCallback): () => void {
    this.contentCallbacks.push(callback);
    return () => {
      this.contentCallbacks = this.contentCallbacks.filter(cb => cb !== callback);
    };
  }

  public subscribeStatus(callback: StatusCallback): () => void {
    callback(this.isOnline);
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyContent(content: PadMap) {
    this.contentCallbacks.forEach(cb => cb(content));
  }

  private notifyStatus(isOnline: boolean) {
    this.statusCallbacks.forEach(cb => cb(isOnline));
  }

  public broadcastUpdate(content: PadMap) {
    this.saveLocalContent(content);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'UPDATE', content }));
    }
  }

  public saveLocalContent(content: PadMap) {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(content));
  }

  public getStoredContent(): PadMap {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!stored) return { main: '' };
    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'string') return { main: parsed };
      return parsed;
    } catch {
      return { main: '' };
    }
  }

  public getHistory(): Snippet[] {
    try {
      const json = localStorage.getItem(STORAGE_KEY_HISTORY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  public saveToHistory(history: Snippet[]) {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }
}

export const syncService = new SyncService();
