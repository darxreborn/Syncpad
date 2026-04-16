import React, { useRef, useEffect } from 'react';

interface MobileEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MobileEditor: React.FC<MobileEditorProps> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    adjustHeight();
  }, [value]);

  // Handle keyboard show/hide on mobile
  useEffect(() => {
    const handleResize = () => {
      // Scroll the active element into view when keyboard appears
      if (document.activeElement === textareaRef.current) {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Use visualViewport for better mobile keyboard detection
    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', handleResize);
      return () => viewport.removeEventListener('resize', handleResize);
    }

    // Fallback to window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full min-h-full p-4 bg-transparent text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none border-none"
      placeholder="Start typing or paste your content..."
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      style={{
        // Prevent iOS zoom on focus
        fontSize: '16px',
        // Allow scrolling within the textarea
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    />
  );
};
