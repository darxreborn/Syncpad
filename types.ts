export interface Snippet {
  id: string;
  content: string;
  timestamp: number;
  summary?: string;
  isAiGenerating?: boolean;
}

export interface SyncState {
  status: 'synced' | 'syncing' | 'offline';
  lastUpdated: number;
}

export type PadMap = Record<string, string>;
