import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportAllProjects } from '../exportAll';
import { Project } from '../../types';
import * as exportUtils from '../export';
import * as repository from '../../db/repository';

// Mock JSZip
vi.mock('jszip', () => {
  class MockJSZip {
    folder(name: string) {
      return {
        file: vi.fn(),
      };
    }
    async generateAsync() {
      return new Blob(['test']);
    }
  }

  return {
    default: MockJSZip,
  };
});

// Mock the repository
vi.mock('../../db/repository', () => ({
  projectRepository: {
    getProjectData: vi.fn(),
  },
}));

// Mock export utilities
vi.mock('../export', () => ({
  exportToJSON: vi.fn(),
  exportToMarkdown: vi.fn(),
}));

describe('exportAllProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    // Mock document methods
    document.createElement = vi.fn(() => ({
      click: vi.fn(),
      href: '',
      download: '',
    })) as any;
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  it('should throw error when no projects provided', async () => {
    await expect(exportAllProjects([])).rejects.toThrow('No projects to export');
  });

  it('should export all projects successfully', async () => {
    const mockProjects: Project[] = [
      {
        id: '1',
        name: 'Test Project 1',
        createdAt: Date.now(),
        lastModified: Date.now(),
        systemPrompt: 'Test prompt',
        model: 'gemini-3-flash-preview',
      },
      {
        id: '2',
        name: 'Test Project 2',
        createdAt: Date.now(),
        lastModified: Date.now(),
        systemPrompt: 'Test prompt 2',
        model: 'gemini-3-flash-preview',
      },
    ];

    vi.mocked(repository.projectRepository.getProjectData).mockResolvedValue({
      nodes: [],
      edges: [],
    });

    vi.mocked(exportUtils.exportToJSON).mockReturnValue('{"test": "json"}');
    vi.mocked(exportUtils.exportToMarkdown).mockReturnValue('# Test Markdown');

    await exportAllProjects(mockProjects);

    expect(repository.projectRepository.getProjectData).toHaveBeenCalledTimes(2);
    expect(exportUtils.exportToJSON).toHaveBeenCalledTimes(2);
    expect(exportUtils.exportToMarkdown).toHaveBeenCalledTimes(2);
  });

  it('should continue exporting even if one project fails', async () => {
    const mockProjects: Project[] = [
      {
        id: '1',
        name: 'Test Project 1',
        createdAt: Date.now(),
        lastModified: Date.now(),
        systemPrompt: 'Test prompt',
        model: 'gemini-3-flash-preview',
      },
      {
        id: '2',
        name: 'Test Project 2',
        createdAt: Date.now(),
        lastModified: Date.now(),
        systemPrompt: 'Test prompt 2',
        model: 'gemini-3-flash-preview',
      },
    ];

    vi.mocked(repository.projectRepository.getProjectData)
      .mockRejectedValueOnce(new Error('Failed to load'))
      .mockResolvedValueOnce({ nodes: [], edges: [] });

    vi.mocked(exportUtils.exportToJSON).mockReturnValue('{"test": "json"}');
    vi.mocked(exportUtils.exportToMarkdown).mockReturnValue('# Test Markdown');

    // Should not throw even though first project fails
    await expect(exportAllProjects(mockProjects)).resolves.not.toThrow();
  });
});
