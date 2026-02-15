import { create } from 'zustand';
import { Project } from '../types';
import { projectRepository } from '../db/repository';

interface AppState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: string;
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
    (localStorage.getItem('notetree-font-size') as 'small' | 'medium' | 'large') || 'medium',
  setFontSize: (size) => {
    localStorage.setItem('notetree-font-size', size);
    set({ fontSize: size });
  },

  theme: localStorage.getItem('notetree-theme') || 'default',
  setTheme: (theme) => {
    localStorage.setItem('notetree-theme', theme);
    set({ theme });
  },

  geminiApiKey: localStorage.getItem('notetree-gemini-api-key'),
  setGeminiApiKey: (key) => {
    if (key) {
      localStorage.setItem('notetree-gemini-api-key', key);
    } else {
      localStorage.removeItem('notetree-gemini-api-key');
    }
    set({ geminiApiKey: key });
  },
}));
