import React from 'react';
import { Toaster } from 'sonner';
import { clsx } from 'clsx';
import { useAppStore } from './store/useAppStore';
import { ProjectGallery } from './components/project/ProjectGallery';
import FlowCanvas from './components/canvas/FlowCanvas';

import { Sidebar } from './components/layout/Sidebar';

function App() {
  const { activeProject, theme } = useAppStore();

  return (
    <div
      className={clsx(
        'flex w-full h-screen bg-black overflow-hidden',
        theme !== 'default' && theme
      )}
    >
      <Sidebar />
      <main className="flex-1 relative overflow-hidden">
        {!activeProject ? (
          <ProjectGallery />
        ) : (
          <div className="w-full h-full bg-background text-white">
            <FlowCanvas />
          </div>
        )}
      </main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

export default App;
