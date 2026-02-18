import React from 'react';
import { Toaster } from 'sonner';
import { clsx } from 'clsx';
import { useAppStore } from './store/useAppStore';
import { ProjectGallery } from './components/project/ProjectGallery';
import FlowCanvas from './components/canvas/FlowCanvas';
import { APP_NAME, APP_TAGLINE } from './config';

import { Sidebar } from './components/layout/Sidebar';
import { DeviceRestriction } from './components/layout/DeviceRestriction';

function App() {
  const { activeProject, theme, customThemes } = useAppStore();

  // Set document title dynamically
  React.useEffect(() => {
    document.title = `${APP_NAME} | ${APP_TAGLINE}`;
  }, []);

  // Sync custom theme colors to document root
  React.useEffect(() => {
    if (theme.startsWith('custom-')) {
      const customTheme = customThemes.find((t) => t.id === theme);
      if (customTheme) {
        Object.entries(customTheme.colors).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
        });
        return;
      }
    }

    // Clear all custom properties when switching away
    // This ensures we revert to the default or predefined theme values
    const variables = [
      '--color-brand-primary',
      '--color-brand-secondary',
      '--color-surface-base',
      '--color-surface-raised',
      '--color-surface-overlay',
      '--color-text-main',
      '--color-text-muted',
      '--color-text-dim',
      '--color-border-main',
      '--color-border-accent',
      '--color-note-bg',
      '--color-note-border',
      '--color-note-text',
    ];
    variables.forEach((variable) => {
      document.documentElement.style.removeProperty(variable);
    });
  }, [theme, customThemes]);

  return (
    <DeviceRestriction>
      <div
        className={clsx(
          'flex w-full h-screen bg-background overflow-hidden',
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
    </DeviceRestriction>
  );
}

export default App;
