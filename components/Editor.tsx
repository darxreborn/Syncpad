import React from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, onBlur }) => {
  const isDarkMode = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const handleEditorMount: OnMount = (editor) => {
    // Focus on mount
    editor.focus();
  };

  return (
    <div className="flex h-full w-full overflow-hidden" onBlur={onBlur}>
      <MonacoEditor
        height="100%"
        language="plaintext"
        value={value}
        onChange={(val) => onChange(val || '')}
        theme={isDarkMode ? 'vs-dark' : 'light'}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Fira Code', monospace",
          wordWrap: "on",
          lineNumbersMinChars: 3,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          folding: true,
          links: true, // Enables cmd/ctrl+click to open links
          overviewRulerLanes: 0, // Removes right side indicator
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          }
        }}
      />
    </div>
  );
};
