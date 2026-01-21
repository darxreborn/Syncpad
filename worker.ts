
// Cloudflare Worker Types Polyfill
interface DurableObjectStorage {
  get<T = any>(key: string): Promise<T | undefined>;
  put(key: string, value: any): Promise<void>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface CloudflareWebSocket extends WebSocket {
  accept(): void;
}

declare class WebSocketPair {
  0: CloudflareWebSocket;
  1: CloudflareWebSocket;
}

interface Env {
  SYNCPAD_DO: DurableObjectNamespace;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

// Durable Object class for managing sync sessions
export class SyncPadDO {
  state: DurableObjectState;
  sessions: WebSocket[] = [];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    // Create a WebSocket pair: one for the client, one for the server
    const { 0: client, 1: server } = new WebSocketPair();
    
    server.accept();
    this.sessions.push(server);

    // Immediately send the latest stored content to the new client
    const content = await this.state.storage.get("content");
    if (content) {
      server.send(JSON.stringify({ type: 'UPDATE', content }));
    }

    server.addEventListener("message", async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'UPDATE') {
          // Persist the content
          await this.state.storage.put("content", data.content);
          // Broadcast to all other connected clients
          this.broadcast(event.data as string, server);
        }
      } catch (err) {
        // Ignore malformed messages
      }
    });

    server.addEventListener("close", () => {
      const idx = this.sessions.indexOf(server);
      if (idx > -1) this.sessions.splice(idx, 1);
    });

    return new Response(null, { status: 101, webSocket: client } as any);
  }

  broadcast(msg: string, source: WebSocket) {
    this.sessions = this.sessions.filter(session => {
      try {
        // Send to open sessions that aren't the source
        if (session !== source && session.readyState === WebSocket.OPEN) {
          session.send(msg);
          return true;
        }
        // Keep session if it's still open (just didn't send to self)
        return session.readyState === WebSocket.OPEN;
      } catch {
        return false;
      }
    });
  }
}

// Main Worker Entrypoint
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Route API requests to the Durable Object
    if (url.pathname === '/api/sync') {
      // Use a single "global" ID for this simple app to put everyone in one room
      const id = env.SYNCPAD_DO.idFromName('global-sync-room');
      const obj = env.SYNCPAD_DO.get(id);
      return obj.fetch(request);
    }

    // Serve static frontend assets (Cloudflare Pages / Workers Sites)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};