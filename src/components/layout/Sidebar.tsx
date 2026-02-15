import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFlowStore } from '../../store/useFlowStore';
import { Project } from '../../types';
import { Plus, Search, Folder, Trash2, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip } from '../ui/Tooltip';
import { ProjectDeleteModal } from './ProjectDeleteModal';
import { importProjectFromJSON } from '../../utils/import';

export function Sidebar() {
  const {
    projects,
    activeProject,
    setActiveProject,
    fetchProjects,
    createProject,
    deleteProject,
    renameProject,
  } = useAppStore();
  const { clearData } = useFlowStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const project = await createProject(newProjectName.trim());
    setNewProjectName('');
    setIsCreating(false);
    setActiveProject(project);
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setProjectToDelete({ id, name });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const newProject = await importProjectFromJSON(content);
        await fetchProjects();
        setActiveProject(newProject);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Import failed:', error);
        alert(error instanceof Error ? error.message : 'Failed to import project');
      }
    };
    reader.readAsText(file);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
  };

  const handleProjectClick = (project: Project) => {
    if (activeProject?.id === project.id) return;
    clearData();
    setActiveProject(project);
  };

  const handleProjectDoubleClick = (e: React.MouseEvent, project: Project) => {
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

  return (
    <div className="w-72 h-screen bg-zinc-950 border-r border-zinc-900 flex flex-col z-50 overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 border-b border-zinc-900">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo.png"
            alt="NoteTree"
            className="w-8 h-8 rounded-lg shadow-lg shadow-primary/40"
          />
          <h1 className="font-bold text-xl tracking-tight text-zinc-100">NoteTree</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-2.5 rounded-xl transition-all group"
          >
            <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium">New</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 flex items-center justify-center bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-xl transition-all group"
            title="Import Project"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-zinc-800 focus:outline-none rounded-lg pl-9 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
        <div className="space-y-1">
          {isCreating && (
            <form onSubmit={handleCreate} className="px-1 py-2 lg:px-2">
              <input
                autoFocus
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onBlur={() => !newProjectName && setIsCreating(false)}
                className="w-full bg-zinc-900 border border-rose-500/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                placeholder="Name your project..."
              />
            </form>
          )}

          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className={clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border border-transparent',
                activeProject?.id === project.id
                  ? 'bg-primary/5 border-primary/10 text-primary shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              )}
            >
              <div
                className={clsx(
                  'w-2 h-2 rounded-full',
                  activeProject?.id === project.id
                    ? 'bg-primary animate-pulse'
                    : 'bg-zinc-800 group-hover:bg-zinc-600'
                )}
              />
              <div className="flex-1 min-w-0">
                {editingProjectId === project.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingProjectName}
                    onChange={(e) => setEditingProjectName(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-zinc-900 border border-rose-500/50 rounded px-2 py-1 text-sm font-medium outline-none"
                  />
                ) : (
                  <div
                    onDoubleClick={(e) => handleProjectDoubleClick(e, project)}
                    className="text-sm font-medium truncate"
                  >
                    {project.name}
                  </div>
                )}
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {formatDistanceToNow(project.lastModified)} ago
                </div>
              </div>

              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <Tooltip content="Delete project" position="left">
                  <button
                    onClick={(e) => handleDelete(e, project.id, project.name)}
                    className="p-1.5 hover:bg-zinc-800 text-zinc-600 hover:text-red-500 rounded-md transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && !isCreating && (
            <div className="py-10 text-center">
              <Folder className="w-8 h-8 text-zinc-800 mx-auto mb-3 opacity-20" />
              <span className="text-xs text-zinc-600">No projects found</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-zinc-950/50 border-t border-zinc-900">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-rose-500 to-amber-500 opacity-20" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-zinc-200">Local Space</div>
            <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">
              Research Data Store
            </div>
          </div>
        </div>
      </div>

      <ProjectDeleteModal
        isOpen={!!projectToDelete}
        projectName={projectToDelete?.name || ''}
        onClose={() => setProjectToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
