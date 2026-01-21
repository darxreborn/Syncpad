import React, { useRef, useEffect } from 'react';
import { Snippet } from '../types';
import { Clock, Sparkles, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HistoryDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  history: Snippet[];
  onSelect: (snippet: Snippet) => void;
  onClear: () => void;
}

export const HistoryDropdown: React.FC<HistoryDropdownProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelect,
  onClear
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute bottom-12 left-0 w-80 bg-white dark:bg-dark-inner rounded-sm shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-black/20">
        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Snippets</span>
        {history.length > 0 && (
          <button 
            onClick={onClear}
            className="text-[10px] text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium flex items-center gap-1 uppercase tracking-wide"
          >
            <Trash2 size={10} /> Clear
          </button>
        )}
      </div>

      <div className="max-h-[50vh] overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
            <Clock size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">No recent history</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {history.map((snippet) => (
              <li key={snippet.id}>
                <button
                  onClick={() => {
                    onSelect(snippet);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2d333b] transition-colors group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-200 line-clamp-1 flex items-center gap-1.5">
                      {snippet.isAiGenerating ? (
                        <Sparkles size={10} className="text-purple-500 animate-pulse" />
                      ) : (
                        <Sparkles size={10} className="text-purple-500/0 group-hover:text-purple-500 transition-colors" />
                      )}
                      {snippet.summary || "Untitled Snippet"}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                      {formatDistanceToNow(snippet.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono line-clamp-2 pl-3 border-l-2 border-transparent group-hover:border-purple-200 dark:group-hover:border-purple-800 transition-colors">
                    {snippet.content}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
