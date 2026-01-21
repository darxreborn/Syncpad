import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Wifi, WifiOff, Loader2, Save, Plus, X, ChevronUp, Link as LinkIcon, Cloud } from 'lucide-react';
import { format } from 'date-fns';
import { syncService } from './services/syncService';
import { generateSnippetSummary } from './services/geminiService';
import { Snippet, PadMap } from './types';
import { DEBOUNCE_DELAY_MS, MAX_HISTORY_ITEMS } from './constants';
import { HistoryDropdown } from './components/HistoryDropdown';

const AUTO_SAVE_DELAY_MS = 3000; // 3 seconds of inactivity triggers history save

// Helper component to render text with clickable links
const LinkifiedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return <span className="text-gray-300 dark:text-gray-600">Start typing...</span>;
  
  // Regex to detect URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <div className="whitespace-pre-wrap break-words font-mono text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200">
      {parts.map((part, i) => 
        part.match(urlRegex) ? (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 dark:text-blue-400 hover:underline z-10 relative" 
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [pads, setPads] = useState<PadMap>({ main: '' });
  const [history, setHistory] = useState<Snippet[]>([]);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'synced' | 'autosaving' | 'offline'>('idle');
  const [justSavedMap, setJustSavedMap] = useState<Record<string, boolean>>({});
  const [justCopiedMap, setJustCopiedMap] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Track editing state per pad to toggle between View (Links) and Edit (Textarea)
  const [editingPadId, setEditingPadId] = useState<string | null>(null);

  const lastSavedPadsRef = useRef<PadMap>({ main: '' });
  const isRemoteUpdateRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Initialize
  useEffect(() => {
    const storedPads = syncService.getStoredContent();
    setPads(storedPads);
    lastSavedPadsRef.current = storedPads;
    setHistory(syncService.getHistory());

    const unsubscribeContent = syncService.subscribe((newPads) => {
      if (JSON.stringify(newPads) !== JSON.stringify(lastSavedPadsRef.current)) {
        isRemoteUpdateRef.current = true;
        setPads(newPads);
        lastSavedPadsRef.current = newPads;
        setStatus('synced');
        
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
          setStatus('idle');
        }, 1000);
      }
    });

    const unsubscribeStatus = syncService.subscribeStatus((isOnline) => {
      if (!isOnline) {
        setStatus('offline');
      } else if (status === 'offline') {
        setStatus('idle');
      }
    });

    return () => {
      unsubscribeContent();
      unsubscribeStatus();
    };
  }, []);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Focus textarea when switching to edit mode
  useEffect(() => {
    if (editingPadId && textareaRefs.current[editingPadId]) {
      textareaRefs.current[editingPadId]?.focus();
    }
  }, [editingPadId]);

  const updatePad = (id: string, newContent: string) => {
    const newPads = { ...pads, [id]: newContent };
    setPads(newPads);
    setStatus('syncing');

    // 1. Debounced Sync (Real-time transmission)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      savePads(newPads);
    }, DEBOUNCE_DELAY_MS);

    // 2. Debounced Auto-Save to History (Versioning)
    if (autoSaveTimerRef.current[id]) {
      clearTimeout(autoSaveTimerRef.current[id]);
    }
    autoSaveTimerRef.current[id] = setTimeout(() => {
      performAutoSaveToHistory(newContent);
    }, AUTO_SAVE_DELAY_MS);
  };

  const savePads = useCallback(async (newPads: PadMap) => {
    if (JSON.stringify(newPads) === JSON.stringify(lastSavedPadsRef.current)) {
      setStatus('idle');
      return;
    }

    syncService.broadcastUpdate(newPads);
    lastSavedPadsRef.current = newPads;
    setStatus('synced');
    setTimeout(() => setStatus('idle'), 2000);
  }, []);

  const addToHistory = (content: string, isAuto: boolean = false) => {
    setHistory(prev => {
      // Prevent duplicate consecutive entries
      if (prev.length > 0 && prev[0].content === content) return prev;
      // For auto-save, also prevent saving if content is very short or empty
      if (isAuto && content.trim().length < 5) return prev;

      const newSnippet: Snippet = {
        id: Date.now().toString(),
        content,
        timestamp: Date.now(),
        isAiGenerating: true,
      };
      
      const updated = [newSnippet, ...prev].slice(0, MAX_HISTORY_ITEMS);
      syncService.saveToHistory(updated);
      
      generateSnippetSummary(content).then(summary => {
        setHistory(currentHist => {
          const newHist = currentHist.map(item => 
            item.id === newSnippet.id 
              ? { ...item, summary, isAiGenerating: false }
              : item
          );
          syncService.saveToHistory(newHist);
          return newHist;
        });
      });

      return updated;
    });
  };

  const performAutoSaveToHistory = (content: string) => {
    addToHistory(content, true);
    setStatus('synced'); // Reinforce synced status visually
  };

  const handleManualSave = (id: string, content: string) => {
    if (!content.trim()) return;
    addToHistory(content);
    setJustSavedMap(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setJustSavedMap(prev => ({ ...prev, [id]: false })), 2000);
  };

  const copyToClipboard = async (id: string, content: string) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setJustCopiedMap(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setJustCopiedMap(prev => ({ ...prev, [id]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    syncService.saveToHistory([]);
  };

  const addNewPad = () => {
    const newId = `pad-${Date.now()}`;
    const newPads = { ...pads, [newId]: '' };
    setPads(newPads);
    savePads(newPads);
    setEditingPadId(newId);
  };

  const removePad = (id: string) => {
    const { [id]: removed, ...rest } = pads;
    if (Object.keys(rest).length === 0) return;
    setPads(rest);
    savePads(rest);
  };

  return (
    <div className="h-screen overflow-hidden bg-background dark:bg-dark-outer text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="shrink-0 z-40 bg-white/90 dark:bg-dark-inner/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 h-12 flex items-center justify-between px-6 relative">
          
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-black dark:bg-white rounded-sm flex items-center justify-center shadow-sm">
            <span className="text-white dark:text-black font-bold text-sm select-none">S</span>
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white hidden sm:block">
            SyncPad
          </h1>
        </div>

        {/* Center Clock */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none select-none">
           <span className="text-base sm:text-lg font-medium text-gray-500 dark:text-gray-400 tabular-nums leading-none">
              {format(currentTime, 'HH:mm')}
           </span>
           <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight mt-0.5">
              {format(currentTime, 'EEE dd MMM')}
           </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Continuous Frame Control Group */}
          <div className="flex items-center rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 overflow-hidden h-7">
            
            {/* Sync Status */}
            <div className="flex items-center justify-center gap-1.5 px-3 h-full border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-inner/50" title={status === 'offline' ? 'Offline' : 'Connected'}>
              {status === 'offline' && <WifiOff size={11} className="text-red-500" />}
              {status === 'syncing' && <Loader2 size={11} className="animate-spin text-blue-500" />}
              {status === 'synced' && <Cloud size={11} className="text-green-500" />}
              {status === 'idle' && <Wifi size={11} className="text-gray-400" />}
            </div>

             {/* Add Pad Button */}
            <button
              onClick={addNewPad}
              className="flex items-center justify-center px-2.5 h-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Add new field"
            >
              <Plus size={12} />
            </button>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 py-4 flex gap-4 overflow-x-auto overflow-y-hidden snap-x items-stretch">
        {Object.entries(pads).map(([id, content]: [string, string]) => (
          <div 
            key={id}
            className={`
              snap-center shrink-0 flex flex-col relative 
              flex-1 min-w-[320px] h-full
              bg-white dark:bg-dark-inner rounded-sm shadow-sm border 
              ${editingPadId === id 
                ? 'border-blue-400/50 ring-1 ring-blue-400/20 dark:border-blue-500/30' 
                : 'border-gray-200 dark:border-gray-700'} 
              transition-all duration-200
            `}
          >
            {/* Close button for extra pads */}
            {Object.keys(pads).length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removePad(id); }}
                className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 transition-colors z-20"
              >
                <X size={12} />
              </button>
            )}

            {/* Content Area */}
            <div className="flex-1 relative w-full h-full overflow-hidden">
               {editingPadId === id ? (
                 <textarea
                   ref={el => { textareaRefs.current[id] = el; }}
                   value={content}
                   onChange={(e) => updatePad(id, e.target.value)}
                   onBlur={() => setEditingPadId(null)}
                   placeholder="Start typing..."
                   className="w-full h-full p-5 resize-none outline-none text-sm sm:text-base text-gray-800 dark:text-gray-200 font-mono placeholder:text-gray-300 dark:placeholder:text-gray-600 leading-relaxed bg-transparent"
                   spellCheck={false}
                 />
               ) : (
                 <div 
                   onClick={() => setEditingPadId(id)}
                   className="w-full h-full p-5 overflow-y-auto cursor-text"
                   title="Click to edit"
                 >
                   <LinkifiedText text={content} />
                 </div>
               )}
            </div>
            
            {/* Bottom Toolbar */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-black/10 h-12">
              
              {/* Left: History */}
              <div className="relative flex-1 flex justify-start">
                <button
                  onClick={() => setHistoryOpenId(historyOpenId === id ? null : id)}
                  className={`
                    flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-xs font-medium transition-colors
                    ${historyOpenId === id 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}
                  `}
                  title="History"
                >
                  <ChevronUp size={14} className={`transition-transform duration-200 ${historyOpenId === id ? 'rotate-180' : ''}`} />
                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-[2px] text-[10px] min-w-[18px] text-center">
                    {history.length}
                  </span>
                </button>

                <HistoryDropdown 
                  isOpen={historyOpenId === id}
                  onClose={() => setHistoryOpenId(null)}
                  history={history}
                  onSelect={(snippet) => {
                    updatePad(id, snippet.content);
                  }}
                  onClear={clearHistory}
                />
              </div>

              {/* Center: Save Button */}
              <div className="flex-1 flex justify-center">
                 <button
                  onClick={() => handleManualSave(id, content)}
                  disabled={justSavedMap[id] || !content.trim()}
                  className={`
                    flex items-center gap-1.5 px-6 py-1.5 rounded-sm text-xs font-bold tracking-wide border transition-all shadow-sm
                    ${justSavedMap[id]
                      ? 'bg-green-500 text-white border-green-600' 
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 dark:bg-[#1c1e20] dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white'
                    }
                  `}
                >
                  {justSavedMap[id] ? <Check size={14} /> : <Save size={14} />}
                  {justSavedMap[id] ? 'SAVED' : 'SAVE'}
                </button>
              </div>

              {/* Right: Copy & Count */}
              <div className="flex-1 flex items-center justify-end gap-3">
                 <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono hidden sm:inline">
                  {content.length} chars
                </span>

                <button 
                  onClick={() => copyToClipboard(id, content)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors border
                    ${justCopiedMap[id]
                       ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                       : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-dark-inner dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                  `}
                  title="Copy content"
                >
                  {justCopiedMap[id] ? <Check size={12} /> : <Copy size={12} />}
                  <span>{justCopiedMap[id] ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>

            </div>
          </div>
        ))}
      </main>

    </div>
  );
};

export default App;