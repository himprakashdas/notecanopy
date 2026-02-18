import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Upload, Settings, Save, Palette, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/useAppStore';
import { useFlowStore } from '../../store/useFlowStore';

import { projectRepository } from '../../db/repository';
import { exportToJSON, exportToMarkdown, downloadFile } from '../../utils/export';
import { importProjectFromJSON } from '../../utils/import';

export const CanvasMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  const {
    activeProject,
    updateActiveProject,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    customThemes,
    addCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    setActiveProject,
    fetchProjects,
    geminiApiKey,
    setGeminiApiKey,
  } = useAppStore();

  const { saveStatus, forceSave } = useFlowStore();

  const [systemPrompt, setSystemPrompt] = useState(activeProject?.systemPrompt || '');
  const [model, setModel] = useState(activeProject?.model || 'gemini-3-flash-preview');
  const [apiKey, setApiKey] = useState(geminiApiKey || '');

  const [currentEditingThemeId, setCurrentEditingThemeId] = useState<string | null>(null);
  const [themeName, setThemeName] = useState('');

  const [editedCustomColors, setEditedCustomColors] = useState<Record<string, string>>({
    '--color-brand-primary': '#f43f5e',
    '--color-brand-secondary': '#eab308',
    '--color-surface-base': '#000000',
    '--color-surface-raised': '#18181b',
    '--color-surface-overlay': '#27272a',
    '--color-text-main': '#ffffff',
    '--color-text-muted': '#a1a1aa',
    '--color-text-dim': '#52525b',
    '--color-border-main': '#27272a',
    '--color-border-accent': 'rgba(244, 63, 94, 0.5)',
    '--color-note-bg': '#fefce8',
    '--color-note-border': '#eab308',
    '--color-note-text': '#854d0e',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // No longer sync automatically to allow local edits
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Close menu and settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
        setShowThemeSelector(false);
        setShowCustomEditor(false);
      }
    };

    if (isOpen || showSettings || showThemeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showSettings]);

  // Close menu and settings when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowSettings(false);
        setShowThemeSelector(false);
      }
    };

    if (isOpen || showSettings || showThemeSelector) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, showSettings]);

  // Close settings when menu is closed
  useEffect(() => {
    if (!isOpen) {
      setShowSettings(false);
      setShowThemeSelector(false);
      setShowCustomEditor(false);
    }
  }, [isOpen]);

  const handleExport = async (format: 'markdown' | 'json') => {
    if (!activeProject) return;
    try {
      const { nodes: currentNodes, edges: currentEdges } = await projectRepository.getProjectData(
        activeProject.id
      );
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let content = '';
      let filename = '';
      let type = '';

      if (format === 'json') {
        content = exportToJSON(activeProject, currentNodes, currentEdges);
        filename = `${activeProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.json`;
        type = 'application/json';
      } else {
        content = exportToMarkdown(activeProject, currentNodes, currentEdges);
        filename = `${activeProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.md`;
        type = 'text/markdown';
      }

      downloadFile(content, filename, type);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      await executeImport(content);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const executeImport = async (content: string) => {
    try {
      const newProject = await importProjectFromJSON(content);
      await fetchProjects();
      setActiveProject(newProject);
      setIsOpen(false);
    } catch (error) {
      console.error('Import failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to import project');
    }
  };

  const handleSaveSettings = async () => {
    await updateActiveProject({ systemPrompt, model });
    setGeminiApiKey(apiKey);
    setShowSettings(false);
  };

  const handleSaveCustomTheme = () => {
    if (!themeName.trim()) {
      alert('Please enter a theme name');
      return;
    }

    if (currentEditingThemeId) {
      updateCustomTheme(currentEditingThemeId, themeName, editedCustomColors);
      setTheme(currentEditingThemeId);
    } else {
      const newId = addCustomTheme(themeName, editedCustomColors);
      setTheme(newId);
    }
    // Theme applied, but keep editor open for further tweaks
  };

  const handleCreateNewTheme = () => {
    setCurrentEditingThemeId(null);
    setThemeName('My Custom Theme');
    setEditedCustomColors({
      '--color-brand-primary': '#f43f5e',
      '--color-brand-secondary': '#eab308',
      '--color-surface-base': '#000000',
      '--color-surface-raised': '#18181b',
      '--color-surface-overlay': '#27272a',
      '--color-text-main': '#ffffff',
      '--color-text-muted': '#a1a1aa',
      '--color-text-dim': '#52525b',
      '--color-border-main': '#27272a',
      '--color-border-accent': 'rgba(244, 63, 94, 0.5)',
      '--color-note-bg': '#fefce8',
      '--color-note-border': '#eab308',
      '--color-note-text': '#854d0e',
    });
    setShowThemeSelector(false);
    setShowCustomEditor(true);
  };

  const handleEditTheme = (t: { id: string; name: string; colors: Record<string, string> }) => {
    setCurrentEditingThemeId(t.id);
    setThemeName(t.name);
    setEditedCustomColors(t.colors);
    setShowThemeSelector(false);
    setShowCustomEditor(true);
  };

  const THEME_VARIABLES = [
    { id: '--color-brand-primary', label: 'Brand Primary', category: 'Brand' },
    { id: '--color-brand-secondary', label: 'Brand Secondary', category: 'Brand' },
    { id: '--color-surface-base', label: 'Background', category: 'Surface' },
    { id: '--color-surface-raised', label: 'Surface Raised', category: 'Surface' },
    { id: '--color-surface-overlay', label: 'Surface Overlay', category: 'Surface' },
    { id: '--color-text-main', label: 'Main Text', category: 'Text' },
    { id: '--color-text-muted', label: 'Muted Text', category: 'Text' },
    { id: '--color-text-dim', label: 'Dim Text', category: 'Text' },
    { id: '--color-border-main', label: 'Main Border', category: 'Border' },
    { id: '--color-border-accent', label: 'Accent Border', category: 'Border' },
    { id: '--color-note-bg', label: 'Note Background', category: 'Notes' },
    { id: '--color-note-border', label: 'Note Border', category: 'Notes' },
    { id: '--color-note-text', label: 'Note Text', category: 'Notes' },
  ];

  return (
    <div ref={menuRef} className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2">
      <button
        onClick={toggleMenu}
        className={clsx(
          'p-3 rounded-xl backdrop-blur-md border transition-all shadow-2xl',
          isOpen
            ? 'bg-primary border-primary/50 text-white'
            : 'bg-surface/80 border-border text-text-muted hover:bg-surface hover:text-text-main'
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 w-64 p-3 bg-overlay/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Project Status & Save */}
          <div className="flex items-center justify-between p-2 mb-2 bg-black/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-2 h-2 rounded-full',
                  saveStatus === 'saving'
                    ? 'bg-secondary animate-pulse'
                    : saveStatus === 'saved'
                      ? 'bg-emerald-500'
                      : 'bg-text-dim'
                )}
              />
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                {saveStatus === 'saving' ? 'Syncing' : saveStatus === 'saved' ? 'Synced' : 'Ready'}
              </span>
            </div>
            <button
              onClick={() => forceSave()}
              disabled={saveStatus === 'saving'}
              className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-text-main transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setShowThemeSelector(false);
                setShowCustomEditor(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-text-muted hover:text-text-main transition-all text-sm font-medium group"
            >
              <Settings className="w-4 h-4 text-text-dim group-hover:text-primary" />
              Project Settings
            </button>

            <button
              onClick={() => {
                setShowThemeSelector(!showThemeSelector);
                setShowSettings(false);
                setShowCustomEditor(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-text-muted hover:text-text-main transition-all text-sm font-medium group"
            >
              <Palette className="w-4 h-4 text-text-dim group-hover:text-secondary" />
              Theme Selection
            </button>

            <div className="h-px bg-zinc-800/50 my-1 mx-2" />

            <button
              onClick={handleImportClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-text-muted hover:text-text-main transition-all text-sm font-medium group"
            >
              <Upload className="w-4 h-4 text-text-dim group-hover:text-secondary" />
              Import Project
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <div className="px-3 py-2 space-y-2">
              <div className="text-[10px] text-text-dim font-bold uppercase tracking-widest px-1">
                Export As
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExport('markdown')}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg bg-black/20 hover:bg-surface border border-border/50 text-xs font-semibold text-text-muted hover:text-text-main transition-all"
                >
                  Markdown
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg bg-black/20 hover:bg-surface border border-border/50 text-xs font-semibold text-text-muted hover:text-text-main transition-all"
                >
                  JSON
                </button>
              </div>
            </div>

            <div className="h-px bg-border/50 my-1 mx-2" />

            {/* Text Size */}
            <div className="px-3 py-2 space-y-2">
              <div className="text-[10px] text-text-dim font-bold uppercase tracking-widest px-1">
                Text Size
              </div>
              <div className="flex bg-black/20 rounded-lg p-1 border border-border/50">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={clsx(
                      'flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all',
                      fontSize === size
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-text-muted hover:text-text-main hover:bg-surface'
                    )}
                  >
                    {size.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border/50 my-1 mx-2" />
          </div>
        </div>
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute top-0 right-[280px] w-80 p-5 bg-overlay/98 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest">
                Settings
              </h3>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="text-text-dim hover:text-text-main transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest flex justify-between items-center">
                System Prompt
                <span className="text-text-dim normal-case font-medium">Cmd+Enter to save</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleSaveSettings();
                  }
                }}
                className="w-full h-40 bg-black/40 border border-border rounded-xl p-4 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-all resize-none custom-scrollbar"
                placeholder="Instructions for the AI..."
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-black/40 border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                <optgroup label="Latest Models">
                  <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                </optgroup>
                <optgroup label="Stable Models">
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </optgroup>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-black/40 border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-all"
                placeholder="Enter your Gemini API key..."
              />
              <p className="text-[9px] text-text-dim leading-relaxed italic">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
      {/* Theme Selector Overlay */}
      {showThemeSelector && (
        <div className="absolute top-0 right-[280px] w-64 p-5 bg-overlay/98 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-secondary" />
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest">Themes</h3>
            </div>
            <button
              onClick={() => setShowThemeSelector(false)}
              className="text-text-dim hover:text-text-main transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'default', label: 'Rose', colors: { '--color-brand-primary': '#f43f5e', '--color-surface-base': '#000000' }, isSystem: true },
              { id: 'theme-midnight', label: 'Midnight', colors: { '--color-brand-primary': '#38bdf8', '--color-surface-base': '#000000' }, isSystem: true },
              ...customThemes.map(t => ({ ...t, label: t.name, isSystem: false })),
            ].map((t) => (
              <div key={t.id} className="group/item relative">
                <button
                  onClick={() => setTheme(t.id)}
                  className={clsx(
                    'w-full flex items-center justify-between p-3 rounded-xl border transition-all',
                    theme === t.id
                      ? 'bg-white/10 border-white/20'
                      : 'bg-black/20 border-border/50 hover:bg-white/5 hover:border-border'
                  )}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex -space-x-2">
                      <div
                        className="w-6 h-6 rounded-full border border-white/10"
                        style={{ backgroundColor: (t.colors as any)['--color-brand-primary'] }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-white/10"
                        style={{ backgroundColor: (t.colors as any)['--color-surface-base'] }}
                      />
                    </div>
                    <span
                      className={clsx(
                        'text-sm font-medium transition-colors',
                        theme === t.id ? 'text-text-main' : 'text-text-muted group-hover/item:text-text-main'
                      )}
                    >
                      {t.label}
                    </span>
                  </div>
                  {theme === t.id && (
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                  )}
                </button>
                
                {!t.isSystem && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTheme(t as any);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-text-dim hover:text-text-main transition-colors"
                      title="Edit theme"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this theme?')) {
                          deleteCustomTheme(t.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg text-text-dim hover:text-red-500 transition-colors"
                      title="Delete theme"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={handleCreateNewTheme}
              className="w-full py-2.5 bg-surface hover:bg-overlay text-text-main rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-3 h-3" />
              Create Custom Theme
            </button>
          </div>
        </div>
      )}

      {/* Custom Theme Editor Overlay */}
      {showCustomEditor && (
        <div className="absolute top-0 right-[280px] w-96 max-h-[90vh] p-5 bg-overlay/98 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col">
          <div className="flex justify-between items-center mb-5 shrink-0">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest">
                {currentEditingThemeId ? 'Edit Theme' : 'New Theme'}
              </h3>
            </div>
            <button
              onClick={() => setShowCustomEditor(false)}
              className="text-text-dim hover:text-text-main transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 mb-6 shrink-0">
            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest px-1">
                Theme Name
              </label>
              <input
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Enter theme name..."
                className="w-full bg-black/40 border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-2">
            {['Brand', 'Surface', 'Text', 'Border', 'Notes'].map((category) => (
              <div key={category} className="space-y-3">
                <div className="text-[10px] text-text-dim font-bold uppercase tracking_widest px-1">
                  {category}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {THEME_VARIABLES.filter((v) => v.category === category).map((variable) => (
                    <div key={variable.id} className="flex items-center justify-between gap-4">
                      <label className="text-xs text-zinc-400 font-medium">{variable.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedCustomColors[variable.id]}
                          onChange={(e) =>
                            setEditedCustomColors((prev) => ({
                              ...prev,
                              [variable.id]: e.target.value,
                            }))
                          }
                          className="w-20 bg-black/40 border border-border rounded px-2 py-1 text-[10px] text-text-main focus:outline-none focus:border-primary/50"
                        />
                        <input
                          type="color"
                          value={
                            editedCustomColors[variable.id].startsWith('#')
                              ? editedCustomColors[variable.id]
                              : '#000000'
                          }
                          onChange={(e) =>
                            setEditedCustomColors((prev) => ({
                              ...prev,
                              [variable.id]: e.target.value,
                            }))
                          }
                          className="w-6 h-6 rounded border border-border/50 bg-transparent cursor-pointer overflow-hidden p-0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-border shrink-0">
            <button
              onClick={handleSaveCustomTheme}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all shadow-xl shadow-primary/20"
            >
              Apply Theme
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
