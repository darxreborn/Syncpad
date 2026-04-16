import React, { lazy, Suspense, useState, useEffect } from 'react';
import { isMobileDevice } from '../utils';
import { MobileEditor } from './MobileEditor';

// Lazy load Monaco Editor for desktop only
const MonacoEditorLazy = lazy(() =>
  import('./MonacoEditor').catch(() => {
    console.error('Failed to load Monaco Editor, falling back to mobile editor');
    return { default: MobileEditor as any };
  })
);

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, onBlur }) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  // Detect mobile on client side only
  useEffect(() => {
    setIsClient(true);
    setIsMobile(isMobileDevice());

    // Re-check on resize (e.g., tablet rotation)
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show nothing during SSR
  if (!isClient) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-sm text-gray-400">Loading editor...</div>
      </div>
    );
  }

  // Use mobile editor for mobile devices
  if (isMobile) {
    return (
      <div className="flex h-full w-full overflow-hidden" onBlur={onBlur}>
        <MobileEditor value={value} onChange={onChange} />
      </div>
    );
  }

  // Lazy load Monaco for desktop
  return (
    <div className="flex h-full w-full overflow-hidden" onBlur={onBlur}>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-sm text-gray-400">Loading Monaco Editor...</div>
          </div>
        }
      >
        <MonacoEditorLazy value={value} onChange={onChange} />
      </Suspense>
    </div>
  );
};
