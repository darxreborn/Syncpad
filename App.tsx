import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Wifi, WifiOff, Loader2, Save, ChevronUp, Cloud, PlusSquare } from 'lucide-react';
import { syncService } from './services/syncService';
import { generateSnippetSummary } from './services/geminiService';
import { Snippet, PadMap } from './types';
import { DEBOUNCE_DELAY_MS, MAX_HISTORY_ITEMS } from './constants';
import { HistoryDropdown } from './components/HistoryDropdown';
import { Editor } from './components/Editor';

const AUTO_SAVE_DELAY_MS = 3000;

const App: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [history, setHistory] = useState<Snippet[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'synced' | 'autosaving' | 'offline'>('idle');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [justCopied, setJustCopied] = useState<boolean>(false);

  const lastSavedContentRef = useRef<string>('');
  const isRemoteUpdateRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storedPads = syncService.getStoredContent();
    const initialContent = storedPads['main'] || '';
    setContent(initialContent);
    lastSavedContentRef.current = initialContent;
    setHistory(syncService.getHistory());

    const unsubscribeContent = syncService.subscribe((newPads) => {
      const newMainContent = newPads['main'] || '';
      if (newMainContent !== lastSavedContentRef.current) {
        isRemoteUpdateRef.current = true;
        setContent(newMainContent);
        lastSavedContentRef.current = newMainContent;
        setStatus('synced');
        setTimeout(() => { isRemoteUpdateRef.current = false; setStatus('idle'); }, 1000);
      }
    });

    const unsubscribeStatus = syncService.subscribeStatus((isOnline) => {
      if (!isOnline) setStatus('offline');
      else if (status === 'offline') setStatus('idle');
    });

    return () => { unsubscribeContent(); unsubscribeStatus(); };
  }, []);

  const updateContent = (newContent: string) => {
    setContent(newContent);
    setStatus('syncing');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => saveContent(newContent), DEBOUNCE_DELAY_MS);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => addToHistory(newContent, true), AUTO_SAVE_DELAY_MS);
  };

  const saveContent = useCallback(async (newContent: string) => {
    if (newContent === lastSavedContentRef.current) { setStatus('idle'); return; }
    syncService.broadcastUpdate({ main: newContent });
    lastSavedContentRef.current = newContent;
    setStatus('synced');
    setTimeout(() => setStatus('idle'), 2000);
  }, []);

  const addToHistory = (snippetContent: string, isAuto: boolean = false) => {
    setHistory(prev => {
      if (prev.length > 0 && prev[0].content === snippetContent) return prev;
      if (isAuto && snippetContent.trim().length < 5) return prev;
      const newSnippet: Snippet = { id: Date.now().toString(), content: snippetContent, timestamp: Date.now(), isAiGenerating: true };
      const updated = [newSnippet, ...prev].slice(0, MAX_HISTORY_ITEMS);
      syncService.saveToHistory(updated);
      generateSnippetSummary(snippetContent).then(summary => {
        setHistory(current => {
          const newHist = current.map(item => item.id === newSnippet.id ? { ...item, summary, isAiGenerating: false } : item);
          syncService.saveToHistory(newHist);
          return newHist;
        });
      });
      return updated;
    });
  };

  const handleManualSave = () => {
    if (!content.trim()) return;
    addToHistory(content);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const copyToClipboard = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch (err) { console.error('Failed to copy!', err); }
  };

  const clearHistory = () => { setHistory([]); syncService.saveToHistory([]); };

  const handleNewSnippet = () => {
    if (content.trim()) addToHistory(content);
    updateContent('');
  };

  return (
    <div className="h-screen overflow-hidden bg-background dark:bg-dark-outer text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="shrink-0 z-40 bg-white/90 dark:bg-dark-inner/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 h-10 flex items-center justify-between px-6 relative">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-black dark:bg-white rounded-sm flex items-center justify-center shadow-sm">
            <span className="text-white dark:text-black font-bold text-[10px] select-none">S</span>
          </div>
          <h1 className="text-xs font-semibold tracking-tight text-gray-900 dark:text-white hidden sm:block">SyncPad</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-inner/50 h-6 px-2.5" title={status === 'offline' ? 'Offline' : 'Connected'}>
            {status === 'offline' && <WifiOff size={10} className="text-red-500" />}
            {status === 'syncing' && <Loader2 size={10} className="animate-spin text-blue-500" />}
            {status === 'synced' && <Cloud size={10} className="text-green-500" />}
            {status === 'idle' && <Wifi size={10} className="text-gray-400" />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 py-4 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col relative w-full h-full bg-white dark:bg-dark-inner rounded-sm shadow-sm border border-gray-100 dark:border-gray-800 transition-all duration-200 overflow-hidden">
          
          <div className="flex-1 relative w-full h-full overflow-hidden">
            <Editor value={content} onChange={updateContent} />
          </div>
          
          {/* Bottom Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-inner h-10">
            
            <div className="flex-1 flex items-center gap-2">
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-medium transition-colors ${historyOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                title="History"
              >
                <ChevronUp size={12} className={`transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`} />
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-[2px] text-[10px] min-w-[16px] text-center font-mono">{history.length}</span>
              </button>

              <HistoryDropdown 
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                history={history}
                onSelect={(snippet) => updateContent(snippet.content)}
                onClear={clearHistory}
              />

              <button
                onClick={handleNewSnippet}
                className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-bold tracking-tight text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                title="New Snippet"
              >
                <PlusSquare size={12} />
                <span>NEW</span>
              </button>
            </div>

            <div className="flex-1 flex justify-center">
              <button
                onClick={handleManualSave}
                disabled={justSaved || !content.trim()}
                className={`flex items-center gap-1.5 px-4 py-1 rounded-sm text-[10px] font-bold tracking-wide border transition-all ${justSaved ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-700 border-gray-100 hover:border-gray-200 dark:bg-dark-inner dark:text-gray-400 dark:border-gray-700/50 dark:hover:text-white'}`}
              >
                {justSaved ? <Check size={12} /> : <Save size={12} />}
                {justSaved ? 'SAVED' : 'SAVE'}
              </button>
            </div>

            <div className="flex-1 flex items-center justify-end gap-3">
              <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono hidden md:inline">{content.length} chars</span>
              <button 
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-medium transition-colors border ${justCopied ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/10 dark:border-green-800/20 dark:text-green-400' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 dark:bg-dark-inner dark:border-gray-700/50 dark:text-gray-400 dark:hover:text-white'}`}
              >
                {justCopied ? <Check size={11} /> : <Copy size={11} />}
                <span>{justCopied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
