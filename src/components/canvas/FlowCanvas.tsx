import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nanoid } from 'nanoid';
import {
  Plus,
  Maximize,
  Loader2,
  Unlink,
  Eraser,
  GitGraph,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Trash2,
  LayoutDashboard,
} from 'lucide-react';

import { useFlowStore } from '../../store/useFlowStore';
import { useAppStore } from '../../store/useAppStore';
import { useHotkeys } from '../../hooks/useHotkeys';
import { usePersistence } from '../../hooks/usePersistence';
import ChatNode from './ChatNode';
import NoteNode from './NoteNode';
import ChatOverlay from '../chat/ChatOverlay';
import { DeletionModal } from './DeletionModal';
import { NoteTreeNode } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { useStore } from 'zustand';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { CanvasMenu } from './CanvasMenu';

const nodeTypes: NodeTypes = {
  chatNode: ChatNode,
  noteNode: NoteNode,
};

const FlowCanvasInternal = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    editingNodeId,
    deletingNodeId,
    setDeletingNodeId,
    deleteNodeOnly,
    deleteNodeAndDescendants,
    isLoading,
    loadProjectData,
    removeOrphanedNodes,
    removeEmptyNodes,
    reLayoutTree,
    areNotesHidden,
    toggleAllNotesVisibility,
    clearCanvas,
  } = useFlowStore();

  const { activeProject, renameProject, setActiveProject } = useAppStore();
  const activeProjectId = activeProject?.id;
  const { fitView, setCenter } = useReactFlow();

  const { undo, redo, pastStates, futureStates } = useStore(
    useFlowStore.temporal,
    (state) => state
  );

  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Initialize keyboard shortcuts and persistence
  useHotkeys();
  usePersistence();

  // Load project data ONLY when switching projects
  useEffect(() => {
    if (activeProjectId) {
      loadProjectData(activeProjectId);
    }
  }, [activeProjectId, loadProjectData]);

  const handleProjectNameClick = () => {
    if (activeProject) {
      setEditedProjectName(activeProject.name);
      setIsEditingProjectName(true);
    }
  };

  const handleProjectNameSave = async () => {
    if (activeProject && editedProjectName.trim() && editedProjectName !== activeProject.name) {
      await renameProject(activeProject.id, editedProjectName.trim());
    }
    setIsEditingProjectName(false);
  };

  const handleProjectNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProjectNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingProjectName(false);
    }
  };

  const handleNewConversation = () => {
    const newNodeId = nanoid();
    const newNode: NoteTreeNode = {
      id: newNodeId,
      type: 'chatNode',
      position: { x: 0, y: 0 },
      data: {
        label: '',
        content: '',
        type: 'user',
        createdAt: Date.now(),
      },
      style: { width: 250, height: 120 },
    };
    addNode(newNode);
    setTimeout(() => {
      setCenter(0, 0, { duration: 800, zoom: 1 });
    }, 100);
  };

  const startChat = useCallback(() => {
    const newNodeId = nanoid();
    const newNode: NoteTreeNode = {
      id: newNodeId,
      type: 'chatNode',
      position: { x: 0, y: 0 },
      data: {
        label: 'Hello! This is the first node.',
        content: '',
        type: 'user',
        createdAt: Date.now(),
      },
      style: { width: 250, height: 120 },
    };
    addNode(newNode);

    // Smoothly center on the first node
    setTimeout(() => {
      setCenter(125, 100, { duration: 800, zoom: 1 });
    }, 50);
  }, [addNode, setCenter]);

  const handleDeleteOnly = useCallback(() => {
    if (deletingNodeId) {
      deleteNodeOnly(deletingNodeId);
      setDeletingNodeId(null);
    }
  }, [deletingNodeId, deleteNodeOnly, setDeletingNodeId]);

  const handleDeleteAll = useCallback(() => {
    if (deletingNodeId) {
      deleteNodeAndDescendants(deletingNodeId);
      setDeletingNodeId(null);
    }
  }, [deletingNodeId, deleteNodeAndDescendants, setDeletingNodeId]);

  const isEditing = !!editingNodeId;
  const isDeleting = !!deletingNodeId;

  if (isLoading) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-zinc-500 animate-pulse">Loading your tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full bg-background relative ${isEditing || isDeleting ? 'overflow-hidden' : ''}`}
    >
      {/* HUD - Top Left */}
      <div
        className={`absolute top-6 left-6 z-10 flex gap-4 items-center transition-opacity duration-300 ${isEditing || isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Tooltip content="Back to Dashboard" position="bottom">
          <button
            onClick={() => setActiveProject(null)}
            className="p-2.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all shadow-xl group"
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
        </Tooltip>

        <Tooltip content="Start a new conversation" position="bottom">
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 backdrop-blur-md border border-primary/30 hover:bg-primary/20 text-primary rounded-xl transition-all shadow-xl group"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Conversation</span>
          </button>
        </Tooltip>

        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-primary rounded-full transition-colors" />
          {isEditingProjectName ? (
            <input
              autoFocus
              type="text"
              value={editedProjectName}
              onChange={(e) => setEditedProjectName(e.target.value)}
              onBlur={handleProjectNameSave}
              onKeyDown={handleProjectNameKeyDown}
              className="font-bold text-zinc-100 text-lg tracking-tight bg-zinc-900 border border-primary/50 rounded px-2 py-1 outline-none"
            />
          ) : (
            <span
              onClick={handleProjectNameClick}
              className="font-bold text-zinc-100 text-lg tracking-tight select-none cursor-pointer hover:text-primary transition-colors"
            >
              {activeProject?.name || 'Untitled Project'}
            </span>
          )}
        </div>
      </div>

      {/* Component Menu Container */}
      <div
        className={`transition-opacity duration-300 ${isEditing || isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <CanvasMenu />
      </div>

      {/* HUD - Bottom Left */}
      <div
        className={`absolute bottom-6 left-6 z-10 flex gap-2 transition-opacity duration-300 ${isEditing || isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Tooltip content="Recenter and fit all nodes" position="top">
          <button
            onClick={() => fitView({ duration: 800 })}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors text-sm font-medium shadow-xl"
          >
            <Maximize className="w-4 h-4" />
            Fit View
          </button>
        </Tooltip>

        <div className="h-8 w-px bg-zinc-800 mx-1 self-center" />

        <Tooltip content="Undo (⌘Z)" position="top">
          <button
            onClick={() => undo()}
            disabled={pastStates.length === 0}
            className={clsx(
              'p-2 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-lg transition-colors shadow-xl',
              pastStates.length === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'text-zinc-300 hover:bg-zinc-800'
            )}
          >
            <Undo2 className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip content="Redo (⌘⇧Z)" position="top">
          <button
            onClick={() => redo()}
            disabled={futureStates.length === 0}
            className={clsx(
              'p-2 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-lg transition-colors shadow-xl',
              futureStates.length === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'text-zinc-300 hover:bg-zinc-800'
            )}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* HUD - Bottom Right (Toolbar) */}
      <div
        className={`absolute bottom-6 right-6 z-10 flex gap-2 transition-opacity duration-300 ${isEditing || isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Tooltip content="Remove disconnected nodes" position="top">
          <button
            onClick={removeOrphanedNodes}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors text-sm font-medium shadow-xl"
          >
            <Unlink className="w-4 h-4" />
            Cleanup
          </button>
        </Tooltip>

        <Tooltip content="Remove nodes with no content" position="top">
          <button
            onClick={removeEmptyNodes}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors text-sm font-medium shadow-xl"
          >
            <Eraser className="w-4 h-4" />
            Clear Empty
          </button>
        </Tooltip>

        <Tooltip content="Auto-layout the entire tree" position="top">
          <button
            onClick={reLayoutTree}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 backdrop-blur-md border-primary/20 hover:bg-primary/10 text-primary rounded-lg transition-colors text-sm font-medium shadow-xl"
          >
            <GitGraph className="w-4 h-4" />
            Format Tree
          </button>
        </Tooltip>

        <div className="h-8 w-px bg-zinc-800 mx-1 self-center" />

        <Tooltip content="Clear the entire canvas" position="top">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 backdrop-blur-md border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium shadow-xl"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </Tooltip>
        <Tooltip content={areNotesHidden ? 'Show all notes' : 'Hide all notes'} position="top">
          <button
            onClick={toggleAllNotesVisibility}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 backdrop-blur-md border rounded-lg transition-colors text-sm font-medium shadow-xl',
              areNotesHidden
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                : 'bg-yellow-100/50 border-yellow-400/30 text-yellow-800 hover:bg-yellow-200/50'
            )}
          >
            {areNotesHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {areNotesHidden ? 'Show Notes' : 'Hide Notes'}
          </button>
        </Tooltip>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable={!isEditing && !isDeleting}
        nodesDraggable={!isEditing && !isDeleting}
        panOnDrag={!isEditing && !isDeleting}
        zoomOnScroll={!isEditing && !isDeleting}
        colorMode="dark"
        paneClickDistance={5}
        deleteKeyCode={null} // Handled by useHotkeys
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-surface-overlay)"
        />
      </ReactFlow>

      {/* Empty State Overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <button
            onClick={startChat}
            className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-full shadow-2xl shadow-primary/20 transition-all transform hover:scale-105 font-bold"
          >
            <Plus className="w-5 h-5" />
            Start chat
          </button>
        </div>
      )}

      <ChatOverlay />

      <DeletionModal
        isOpen={isDeleting}
        onClose={() => setDeletingNodeId(null)}
        onDeleteOnly={handleDeleteOnly}
        onDeleteAll={handleDeleteAll}
      />

      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={clearCanvas}
        title="Clear Canvas"
        message="Are you sure you want to clear the entire canvas? This will delete all nodes and edges in this project. This action cannot be easily undone."
        confirmLabel="Clear Everything"
        confirmVariant="danger"
      />
    </div>
  );
};

const FlowCanvas = () => (
  <ReactFlowProvider>
    <FlowCanvasInternal />
  </ReactFlowProvider>
);

export default FlowCanvas;
