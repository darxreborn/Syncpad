import React from 'react';
import MonacoEditorReact, { OnMount } from '@monaco-editor/react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ value, onChange }) => {
  const isDarkMode =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const handleEditorMount: OnMount = (editor) => {
    // Focus on mount
    editor.focus();
  };

  return (
    <MonacoEditorReact
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
        wordWrap: 'on',
        lineNumbersMinChars: 3,
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        folding: true,
        links: true,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
    />
  );
};

export default MonacoEditor;
