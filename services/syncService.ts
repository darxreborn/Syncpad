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

  constructor() {
    this.connect();
  }

  private connect() {
    // Robustly switch protocol: http -> ws, https -> wss
    // This prevents mixed content errors when running on HTTPS
    const protocol = window.location.protocol.replace(/^http/, 'ws');
    const host = window.location.host;
    // Connect to the worker's WebSocket endpoint
    const wsUrl = `${protocol}//${host}/api/sync`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      console.error("WebSocket connection failed", e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.isOnline = true;
      this.reconnectAttempts = 0;
      this.notifyStatus(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE' && data.content) {
          // Update local cache
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
      // Error will usually trigger close, which triggers reconnect
      console.error("WebSocket error", e);
    };
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  public subscribe(callback: ContentCallback): () => void {
    this.contentCallbacks.push(callback);
    return () => {
      this.contentCallbacks = this.contentCallbacks.filter(cb => cb !== callback);
    };
  }

  public subscribeStatus(callback: StatusCallback): () => void {
    callback(this.isOnline); // Immediately notify of current status
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
    // Save locally immediately
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(content));
    
    // Send to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'UPDATE', content }));
    }
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