import { create } from 'zustand';
import { Project } from '../types';
import { projectRepository } from '../db/repository';

interface AppState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: string;
  customThemes: Array<{ id: string; name: string; colors: Record<string, string> }>;
  geminiApiKey: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  setActiveProject: (project: Project | null) => void;
  updateActiveProject: (updates: Partial<Project>) => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (id: string, newName: string) => Promise<void>;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setTheme: (theme: string) => void;
  addCustomTheme: (name: string, colors: Record<string, string>) => string;
  updateCustomTheme: (id: string, name: string, colors: Record<string, string>) => void;
  deleteCustomTheme: (id: string) => void;
  setGeminiApiKey: (key: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await projectRepository.getAllProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      set({ isLoading: false });
    }
  },

  setActiveProject: (project) => {
    set({ activeProject: project });
  },

  updateActiveProject: async (updates) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = { ...activeProject, ...updates };
    await projectRepository.updateProject(activeProject.id, updates);
    set({ activeProject: updatedProject });
  },

  createProject: async (name) => {
    const project = await projectRepository.createProject(name);
    await get().fetchProjects();
    return project;
  },

  deleteProject: async (id) => {
    await projectRepository.deleteProject(id);
    if (get().activeProject?.id === id) {
      set({ activeProject: null });
    }
    await get().fetchProjects();
  },

  renameProject: async (id, newName) => {
    await projectRepository.updateProject(id, { name: newName });
    const { activeProject } = get();
    if (activeProject?.id === id) {
      set({ activeProject: { ...activeProject, name: newName } });
    }
    await get().fetchProjects();
  },

  fontSize:
    (localStorage.getItem('NoteCanopy-font-size') as 'small' | 'medium' | 'large') || 'medium',
  setFontSize: (size) => {
    localStorage.setItem('NoteCanopy-font-size', size);
    set({ fontSize: size });
  },

  theme: (() => {
    const stored = localStorage.getItem('NoteCanopy-theme');
    const removedThemes = ['theme-navy', 'theme-bruvbox', 'theme-winter'];
    if (stored && removedThemes.includes(stored)) {
      localStorage.setItem('NoteCanopy-theme', 'default');
      return 'default';
    }
    return stored || 'default';
  })(),
  setTheme: (theme) => {
    localStorage.setItem('NoteCanopy-theme', theme);
    set({ theme });
  },

  customThemes: JSON.parse(localStorage.getItem('NoteCanopy-custom-themes') || '[]'),
  addCustomTheme: (name, colors) => {
    const id = `custom-${Date.now()}`;
    const newTheme = { id, name, colors };
    const updatedThemes = [...get().customThemes, newTheme];
    localStorage.setItem('NoteCanopy-custom-themes', JSON.stringify(updatedThemes));
    set({ customThemes: updatedThemes });
    return id;
  },
  updateCustomTheme: (id, name, colors) => {
    const updatedThemes = get().customThemes.map((t) => (t.id === id ? { ...t, name, colors } : t));
    localStorage.setItem('NoteCanopy-custom-themes', JSON.stringify(updatedThemes));
    set({ customThemes: updatedThemes });
  },
  deleteCustomTheme: (id) => {
    const updatedThemes = get().customThemes.filter((t) => t.id !== id);
    localStorage.setItem('NoteCanopy-custom-themes', JSON.stringify(updatedThemes));
    set({ customThemes: updatedThemes });
    if (get().theme === id) {
      get().setTheme('default');
    }
  },

  geminiApiKey: localStorage.getItem('NoteCanopy-gemini-api-key'),
  setGeminiApiKey: (key) => {
    if (key) {
      localStorage.setItem('NoteCanopy-gemini-api-key', key);
    } else {
      localStorage.removeItem('NoteCanopy-gemini-api-key');
    }
    set({ geminiApiKey: key });
  },
}));
