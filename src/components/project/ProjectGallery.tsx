import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Trash2, FolderOpen, Loader2, Edit2, Download, PackageOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Project } from '../../types';
import { APP_NAME } from '../../config';
import { ProjectExportModal } from '../layout/ProjectExportModal';
import { ExportAllModal } from '../layout/ExportAllModal';
import { projectRepository } from '../../db/repository';
import { exportToJSON, exportToMarkdown, downloadFile } from '../../utils/export';
import { exportAllProjects } from '../../utils/exportAll';

export function ProjectGallery() {
  const {
    projects,
    isLoading,
    fetchProjects,
    createProject,
    deleteProject,
    setActiveProject,
    renameProject,
  } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [projectToExport, setProjectToExport] = useState<{ id: string; name: string } | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [showExportAllModal, setShowExportAllModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    await createProject(newProjectName.trim());
    setNewProjectName('');
    setIsCreating(false);
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (
      confirm(
        'Are you sure you want to delete this project? All nodes and edges will be permanently removed.'
      )
    ) {
      await deleteProject(id);
    }
  };

  const handleExportClick = (e: React.MouseEvent, project: { id: string; name: string }) => {
    e.stopPropagation();
    setProjectToExport(project);
  };

  const handleExportConfirm = async (format: 'markdown' | 'json') => {
    if (!projectToExport) return;

    try {
      const project = projects.find((p) => p.id === projectToExport.id);
      if (!project) return;

      const { nodes, edges } = await projectRepository.getProjectData(project.id);

      let content = '';
      let filename = '';
      let type = '';

      if (format === 'json') {
        content = exportToJSON(project, nodes, edges);
        filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
        type = 'application/json';
      } else {
        content = exportToMarkdown(project, nodes, edges);
        filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.md`;
        type = 'text/markdown';
      }

      downloadFile(content, filename, type);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setProjectToExport(null);
    }
  };

  const handleEditProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
  };

  const handleRenameSubmit = async () => {
    if (editingProjectId && editingProjectName.trim()) {
      await renameProject(editingProjectId, editingProjectName.trim());
    }
    setEditingProjectId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingProjectId(null);
    }
  };

  const handleExportAllClick = () => {
    if (projects.length === 0) {
      alert('No projects to export');
      return;
    }
    setShowExportAllModal(true);
  };

  const handleExportAllConfirm = async (format: 'json' | 'markdown' | 'both') => {
    setShowExportAllModal(false);
    setIsExportingAll(true);
    try {
      await exportAllProjects(projects, format);
    } catch (error) {
      console.error('Export all failed:', error);
      alert('Failed to export projects. Please try again.');
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="h-full bg-background text-text-main p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-2">Welcome to {APP_NAME}</h2>
              <p className="text-zinc-500">
                Pick a project to continue your learning journey.
              </p>
            </div>
            {projects.length > 0 && (
              <button
                onClick={handleExportAllClick}
                disabled={isExportingAll}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-rose-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                title="Export all projects as ZIP"
              >
                {isExportingAll ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <PackageOpen size={18} />
                    <span>Export All</span>
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {isCreating && (
          <div className="mb-12 p-6 border border-gray-800 rounded-xl bg-gray-900/50">
            <form onSubmit={handleCreateProject} className="flex gap-4">
              <input
                autoFocus
                type="text"
                placeholder="Project Name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="bg-primary px-6 py-2 rounded-lg font-medium hover:bg-rose-600 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-6 py-2 rounded-lg font-medium border border-gray-700 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 && !isCreating && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-800 rounded-2xl">
                <FolderOpen className="mx-auto text-gray-700 mb-4" size={48} />
                <p className="text-gray-500 text-xl">No projects yet. Create one to get started!</p>
              </div>
            )}

            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setActiveProject(project)}
                className="group cursor-pointer p-6 border border-gray-800 rounded-xl bg-gray-900/30 hover:bg-gray-900/60 hover:border-primary/50 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  {editingProjectId === project.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={handleRenameKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-xl font-semibold bg-black border border-primary/50 rounded px-3 py-1 outline-none text-white"
                    />
                  ) : (
                    <h3 className="text-xl font-semibold group-hover:text-primary transition-colors truncate pr-4">
                      {project.name}
                    </h3>
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => handleExportClick(e, project)}
                      className="text-gray-600 hover:text-indigo-400 p-1 rounded-md transition-colors"
                      title="Export Project"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={(e) => handleEditProject(e, project)}
                      className="text-gray-600 hover:text-primary p-1 rounded-md transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="text-gray-600 hover:text-red-500 p-1 rounded-md transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Last modified {formatDistanceToNow(project.lastModified)} ago
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProjectExportModal
        isOpen={!!projectToExport}
        projectName={projectToExport?.name || ''}
        onClose={() => setProjectToExport(null)}
        onExportGeneric={handleExportConfirm}
      />

      <ExportAllModal
        isOpen={showExportAllModal}
        projectCount={projects.length}
        onClose={() => setShowExportAllModal(false)}
        onExport={handleExportAllConfirm}
      />
    </div>
  );
}
