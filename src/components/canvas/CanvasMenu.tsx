import React, { useState, useRef } from 'react';
import { Menu, X, Upload, Settings, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/useAppStore';
import { useFlowStore } from '../../store/useFlowStore';

import { projectRepository } from '../../db/repository';
import { exportToJSON, exportToMarkdown, downloadFile } from '../../utils/export';
import { importProjectFromJSON } from '../../utils/import';

export const CanvasMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    activeProject,
    updateActiveProject,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    setActiveProject,
    fetchProjects,
    geminiApiKey,
    setGeminiApiKey,
  } = useAppStore();

  const { saveStatus, forceSave } = useFlowStore();

  const [systemPrompt, setSystemPrompt] = useState(activeProject?.systemPrompt || '');
  const [model, setModel] = useState(activeProject?.model || 'gemini-3-flash-preview');
  const [apiKey, setApiKey] = useState(geminiApiKey || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleExport = async (format: 'markdown' | 'json') => {
    if (!activeProject) return;
    try {
      const { nodes: currentNodes, edges: currentEdges } = await projectRepository.getProjectData(
        activeProject.id
      );
      let content = '';
      let filename = '';
      let type = '';

      if (format === 'json') {
        content = exportToJSON(activeProject, currentNodes, currentEdges);
        filename = `${activeProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
        type = 'application/json';
      } else {
        content = exportToMarkdown(activeProject, currentNodes, currentEdges);
        filename = `${activeProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.md`;
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

  return (
    <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2">
      <button
        onClick={toggleMenu}
        className={clsx(
          'p-3 rounded-xl backdrop-blur-md border transition-all shadow-2xl',
          isOpen
            ? 'bg-primary border-primary/50 text-white'
            : 'bg-surface/80 border-border text-zinc-300 hover:bg-surface hover:text-white'
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 w-64 p-3 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Project Status & Save */}
          <div className="flex items-center justify-between p-2 mb-2 bg-black/40 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-2 h-2 rounded-full',
                  saveStatus === 'saving'
                    ? 'bg-secondary animate-pulse'
                    : saveStatus === 'saved'
                      ? 'bg-emerald-500'
                      : 'bg-zinc-600'
                )}
              />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {saveStatus === 'saving' ? 'Syncing' : saveStatus === 'saved' ? 'Synced' : 'Ready'}
              </span>
            </div>
            <button
              onClick={() => forceSave()}
              disabled={saveStatus === 'saving'}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-zinc-300 hover:text-white transition-all text-sm font-medium group"
            >
              <Settings className="w-4 h-4 text-zinc-500 group-hover:text-primary" />
              Project Settings
            </button>

            <div className="h-px bg-zinc-800/50 my-1 mx-2" />

            <button
              onClick={handleImportClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-zinc-300 hover:text-white transition-all text-sm font-medium group"
            >
              <Upload className="w-4 h-4 text-zinc-500 group-hover:text-secondary" />
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
              <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-1">
                Export As
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExport('markdown')}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800/50 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-all"
                >
                  Markdown
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800/50 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-all"
                >
                  JSON
                </button>
              </div>
            </div>

            <div className="h-px bg-zinc-800/50 my-1 mx-2" />

            {/* Text Size */}
            <div className="px-3 py-2 space-y-2">
              <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-1">
                Text Size
              </div>
              <div className="flex bg-zinc-950/50 rounded-lg p-1 border border-zinc-800/50">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={clsx(
                      'flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all',
                      fontSize === size
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface'
                    )}
                  >
                    {size.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-zinc-800/50 my-1 mx-2" />

            {/* Theme Selection */}
            <div className="px-3 py-2 space-y-2">
              <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-1">
                Theme
              </div>
              <div className="flex bg-zinc-950/50 rounded-lg p-1 border border-zinc-800/50">
                {[
                  { id: 'default', label: 'Rose' },
                  { id: 'theme-midnight', label: 'Midnight' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={clsx(
                      'flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all',
                      theme === t.id
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute top-0 right-[280px] w-80 p-5 bg-zinc-900/98 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest">
                Settings
              </h3>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="text-zinc-600 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex justify-between items-center">
                System Prompt
                <span className="text-zinc-700 normal-case font-medium">Cmd+Enter to save</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleSaveSettings();
                  }
                }}
                className="w-full h-40 bg-black border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 transition-all resize-none custom-scrollbar"
                placeholder="Instructions for the AI..."
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
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
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 transition-all"
                placeholder="Enter your Gemini API key..."
              />
              <p className="text-[9px] text-zinc-600 leading-relaxed italic">
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
    </div>
  );
};
