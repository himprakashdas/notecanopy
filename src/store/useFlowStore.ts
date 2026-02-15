import { create } from 'zustand';
import { temporal } from 'zundo';
import debounce from 'lodash.debounce';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from '@xyflow/react';
import { nanoid } from 'nanoid';
import { NoteTreeNode, NoteTreeEdge } from '../types';
import { projectRepository } from '../db/repository';
import { useAIStore } from './useAIStore';
import { useAppStore } from './useAppStore';
import { createContextSnapshot } from '../utils/ai';

interface FlowState {
  nodes: NoteTreeNode[];
  edges: NoteTreeEdge[];
  editingNodeId: string | null;
  deletingNodeId: string | null;
  isLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  areNotesHidden: boolean;

  // Actions
  onNodesChange: OnNodesChange<NoteTreeNode>;
  onEdgesChange: OnEdgesChange<NoteTreeEdge>;
  onConnect: OnConnect;
  setNodes: (nodes: NoteTreeNode[]) => void;
  setEdges: (edges: NoteTreeEdge[]) => void;
  addNode: (node: NoteTreeNode) => void;
  addBranch: (parentId: string) => Promise<NoteTreeNode | undefined>;
  addAIChild: (parentId: string) => Promise<NoteTreeNode | undefined>;
  addNoteChild: (parentId: string) => Promise<void>;
  deleteNodeOnly: (nodeId: string) => void;
  deleteNodeAndDescendants: (nodeId: string) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setDeletingNodeId: (nodeId: string | null) => void;
  updateNodeContent: (nodeId: string, label: string) => void;
  updateNodeThinking: (nodeId: string, thinking: boolean) => void;
  loadProjectData: (projectId: string) => Promise<void>;
  forceSave: () => Promise<void>;
  removeOrphanedNodes: () => Promise<void>;
  removeEmptyNodes: () => Promise<void>;
  reLayoutTree: () => Promise<void>;
  clearCanvas: () => Promise<void>;
  clearData: () => void;

  // Note specific actions
  createNote: (position: { x: number; y: number }) => void;
  toggleNoteVisibility: (nodeId: string) => void;
  toggleAllNotesVisibility: () => void;
}

export const useFlowStore = create<FlowState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      editingNodeId: null,
      deletingNodeId: null,
      isLoading: false,
      saveStatus: 'idle',
      areNotesHidden: false,

      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },

      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },

      onConnect: (connection) => {
        const newEdges = addEdge(connection, get().edges);
        set({
          edges: newEdges as NoteTreeEdge[],
        });
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      addNode: (node) => set({ nodes: [...get().nodes, node] }),

      addBranch: async (parentId: string) => {
        const { nodes, edges } = get();
        const parentNode = nodes.find((n) => n.id === parentId);
        if (!parentNode || parentNode.data.thinking) return undefined;

        const role: 'user' | 'ai' = 'user';
        const isSameRole = role === parentNode.data.type;
        const newNodeId = nanoid();
        const parentEdge = edges.find((e) => e.target === parentId);
        const actualParentId = isSameRole && parentEdge ? parentEdge.source : parentId;

        const H_GAP = 280;
        const siblingsCount = edges.filter((e) => e.source === actualParentId).length;

        const getOffset = (index: number) => {
          if (index === 0) return 0;
          const side = index % 2 === 0 ? -1 : 1;
          const rank = Math.ceil(index / 2);
          return side * rank * H_GAP;
        };

        const parentHeight =
          typeof parentNode.style?.height === 'number' ? parentNode.style.height : 120;
        const V_GAP = parentHeight + 60;

        const newNode: NoteTreeNode = {
          id: newNodeId,
          type: 'chatNode',
          position: {
            x: isSameRole
              ? parentNode.position.x + H_GAP
              : parentNode.position.x + getOffset(siblingsCount),
            y: isSameRole ? parentNode.position.y : parentNode.position.y + V_GAP,
          },
          data: {
            label: '',
            content: '',
            type: role,
            thinking: false,
            createdAt: Date.now(),
          },
          style: { width: 250, height: 120 },
        };

        const newEdge: NoteTreeEdge = {
          id: `e-${actualParentId}-${newNodeId}`,
          source: actualParentId,
          target: newNodeId,
        };

        set({
          nodes: [...nodes, newNode],
          edges: isSameRole && !parentEdge ? edges : [...edges, newEdge],
        });

        // Auto-layout after adding branch
        await get().reLayoutTree();

        // Return updated node from store
        return get().nodes.find((n) => n.id === newNodeId);
      },

      addAIChild: async (parentId: string) => {
        const { nodes, edges } = get();
        const parentNode = nodes.find((n) => n.id === parentId);
        if (!parentNode || parentNode.data.thinking) return undefined;

        const newNodeId = nanoid();
        const H_GAP = 500; // Increased gap for larger AI nodes
        const childrenCount = edges.filter((e) => e.source === parentId).length;

        const parentHeight =
          typeof parentNode.style?.height === 'number' ? parentNode.style.height : 120;
        const V_GAP = parentHeight + 60;

        const getOffset = (index: number) => {
          if (index === 0) return 0;
          const side = index % 2 === 0 ? -1 : 1;
          const rank = Math.ceil(index / 2);
          return side * rank * H_GAP;
        };

        const newNode: NoteTreeNode = {
          id: newNodeId,
          type: 'chatNode',
          position: {
            x: parentNode.position.x + getOffset(childrenCount),
            y: parentNode.position.y + V_GAP,
          },
          data: {
            label: '',
            content: '',
            type: 'ai',
            thinking: true,
            createdAt: Date.now(),
          },
          style: { width: 450, height: 562 },
        };

        const newEdge: NoteTreeEdge = {
          id: `e-${parentId}-${newNodeId}`,
          source: parentId,
          target: newNodeId,
        };

        set({
          nodes: [...nodes, newNode],
          edges: [...edges, newEdge],
        });

        const projectId = useAppStore.getState().activeProject?.id;
        if (projectId) {
          createContextSnapshot(projectId, parentId, get().nodes, get().edges).then((snapshot) => {
            useAIStore.getState().enqueue(newNodeId, snapshot);
          });
        }

        // Auto-layout after adding AI child
        await get().reLayoutTree();

        // Return updated node from store
        return get().nodes.find((n) => n.id === newNodeId);
      },

      addNoteChild: async (parentId: string) => {
        const { nodes, edges } = get();
        const parentNode = nodes.find((n) => n.id === parentId);
        if (!parentNode) return;

        const newNodeId = nanoid();

        // Initial position: To the right of parent
        const parentWidth =
          typeof parentNode.style?.width === 'number' ? parentNode.style.width : 250;

        const newNode: NoteTreeNode = {
          id: newNodeId,
          type: 'noteNode',
          position: {
            x: parentNode.position.x + parentWidth + 5,
            y: parentNode.position.y,
          },
          data: {
            label: 'Attached Note',
            content: '',
            type: 'note',
            createdAt: Date.now(),
            isHidden: false,
          },
          style: { width: 250, height: 150 },
          dragHandle: '.custom-drag-handle',
        };

        const newEdge: NoteTreeEdge = {
          id: `e-${parentId}-${newNodeId}`,
          source: parentId,
          target: newNodeId,
          type: 'default',
          animated: true,
          style: { stroke: '#eab308', strokeDasharray: '5,5' },
        };

        set({
          nodes: [...nodes, newNode],
          edges: [...edges, newEdge],
        });

        get().forceSave();
        // Auto-layout after adding note
        await get().reLayoutTree();
      },

      deleteNodeOnly: (nodeId) => {
        set({
          nodes: get().nodes.filter((node) => node.id !== nodeId),
          edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        });
      },

      deleteNodeAndDescendants: (nodeId) => {
        const { nodes, edges } = get();
        const descendants = new Set<string>();

        const findDescendants = (id: string) => {
          edges.forEach((edge) => {
            if (edge.source === id) {
              descendants.add(edge.target);
              findDescendants(edge.target);
            }
          });
        };

        descendants.add(nodeId);
        findDescendants(nodeId);

        set({
          nodes: nodes.filter((node) => !descendants.has(node.id)),
          edges: edges.filter(
            (edge) => !descendants.has(edge.source) && !descendants.has(edge.target)
          ),
        });
      },

      setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
      setDeletingNodeId: (nodeId) => set({ deletingNodeId: nodeId }),

      updateNodeContent: (nodeId, label) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
          ),
        });
      },

      updateNodeThinking: (nodeId, thinking) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, thinking } } : node
          ),
        });
      },

      loadProjectData: async (projectId) => {
        set({ isLoading: true });
        try {
          const { nodes, edges } = await projectRepository.getProjectData(projectId);
          useFlowStore.temporal.getState().clear();
          set({
            nodes: nodes as NoteTreeNode[],
            edges: edges as NoteTreeEdge[],
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load project data:', error);
          set({ isLoading: false });
        }
      },

      forceSave: async () => {
        const { nodes, edges } = get();
        const activeProject = useAppStore.getState().activeProject;
        if (!activeProject) return;

        set({ saveStatus: 'saving' });
        try {
          await projectRepository.saveNodes(activeProject.id, nodes);
          await projectRepository.saveEdges(activeProject.id, edges);
          await projectRepository.updateProject(activeProject.id, {});
          set({ saveStatus: 'saved' });
          setTimeout(() => set({ saveStatus: 'idle' }), 2000);
        } catch (error) {
          console.error('Manual save failed:', error);
          set({ saveStatus: 'idle' });
        }
      },

      removeOrphanedNodes: async () => {
        const { nodes, edges } = get();
        const connectedNodeIds = new Set();
        edges.forEach((edge) => {
          connectedNodeIds.add(edge.source);
          connectedNodeIds.add(edge.target);
        });
        // Keep noteNodes even if orphaned
        const filteredNodes = nodes.filter(
          (node, index) => index === 0 || connectedNodeIds.has(node.id) || node.type === 'noteNode'
        );
        set({ nodes: filteredNodes });
        await get().forceSave();
      },

      removeEmptyNodes: async () => {
        const { nodes, edges } = get();
        const emptyNodeIds = nodes
          .filter(
            (n) => (!n.data.label || n.data.label.trim().length === 0) && n.type !== 'noteNode'
          )
          .map((n) => n.id);
        if (emptyNodeIds.length === 0) return;
        set({
          nodes: nodes.filter((n) => !emptyNodeIds.includes(n.id)),
          edges: edges.filter(
            (e) => !emptyNodeIds.includes(e.source) && !emptyNodeIds.includes(e.target)
          ),
        });
        await get().forceSave();
      },

      reLayoutTree: async () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        const MIN_H_GAP = 80; // Gap between conversation branches
        const MIN_V_GAP_BASE = 60; // Base vertical gap
        const NOTE_GAP = 5; // Gap between parent and attached note

        const newNodes = [...nodes];
        const processed = new Set<string>();

        // Helper to get node dimensions
        const getNodeDimensions = (nodeId: string) => {
          const node = newNodes.find((n) => n.id === nodeId);
          if (!node) return { width: 250, height: 120 };

          let width = 250;
          let height = 120;

          if (node.measured?.width) width = node.measured.width;
          else if (typeof node.style?.width === 'number') width = node.style.width;
          else if (typeof node.width === 'number') width = node.width;

          if (node.measured?.height) height = node.measured.height;
          else if (typeof node.style?.height === 'number') height = node.style.height;
          else if (typeof node.height === 'number') height = node.height;

          return { width, height };
        };

        // Calculate subtree width (Excluding attached notes from the "tree width" calculation)
        const calculateSubtreeWidth = (nodeId: string): number => {
          // Only follow edges to NON-NOTE nodes for the main tree structure
          const children = edges
            .filter((e) => e.source === nodeId)
            .map((e) => newNodes.find((n) => n.id === e.target))
            .filter((n) => n && n.type !== 'noteNode') // Exclude notes from width calc
            .map((n) => n!.id);

          if (children.length === 0) {
            return getNodeDimensions(nodeId).width;
          }

          const childrenWidths = children.map((childId) => calculateSubtreeWidth(childId));
          const totalChildrenWidth = childrenWidths.reduce((sum, w) => sum + w, 0);
          const gapsWidth = (children.length - 1) * MIN_H_GAP;
          const subtreeWidth = totalChildrenWidth + gapsWidth;

          const nodeWidth = getNodeDimensions(nodeId).width;
          return Math.max(nodeWidth, subtreeWidth);
        };

        const layout = (nodeId: string, x: number, y: number) => {
          const nodeIndex = newNodes.findIndex((n) => n.id === nodeId);
          if (nodeIndex === -1 || processed.has(nodeId)) return;

          const nodeDims = getNodeDimensions(nodeId);

          // 1. Position the current node
          newNodes[nodeIndex] = {
            ...newNodes[nodeIndex],
            position: { x: x - nodeDims.width / 2, y },
          };
          processed.add(nodeId);

          // 2. Identify Children
          const allChildEdges = edges.filter((e) => e.source === nodeId);

          // Separate Note Children vs Chat Children
          const noteChildren = allChildEdges
            .map((e) => newNodes.find((n) => n.id === e.target))
            .filter((n) => n && n.type === 'noteNode') as NoteTreeNode[];

          const chatChildren = allChildEdges
            .map((e) => newNodes.find((n) => n.id === e.target))
            .filter((n) => n && n.type !== 'noteNode') as NoteTreeNode[];

          // 3. Layout Attached Notes (To the Right)
          if (noteChildren.length > 0) {
            let currentNoteY = y;
            noteChildren.forEach((noteNode) => {
              // We just position them directly here since they are "leaves" in this context
              // or we can recursively layout them if notes could have children (unlikely for now)
              const noteIndex = newNodes.findIndex((n) => n.id === noteNode.id);
              if (noteIndex !== -1 && !processed.has(noteNode.id)) {
                newNodes[noteIndex] = {
                  ...newNodes[noteIndex],
                  position: {
                    x: x + nodeDims.width / 2 + NOTE_GAP,
                    y: currentNoteY,
                  },
                };
                processed.add(noteNode.id);

                // Stack next note below this one
                const noteDims = getNodeDimensions(noteNode.id);
                currentNoteY += noteDims.height + 20;
              }
            });
          }

          // 4. Layout Chat Children (Below)
          if (chatChildren.length === 0) return;

          const childSubtreeWidths = chatChildren.map((child) => calculateSubtreeWidth(child.id));
          const totalWidth =
            childSubtreeWidths.reduce((sum, w) => sum + w, 0) +
            (chatChildren.length - 1) * MIN_H_GAP;

          let currentX = x - totalWidth / 2;

          // Dynamic Vertical Gap based on current node height
          const V_GAP = nodeDims.height + MIN_V_GAP_BASE;

          chatChildren.forEach((child, index) => {
            const childSubtreeWidth = childSubtreeWidths[index];
            const childCenterX = currentX + childSubtreeWidth / 2;
            const childY = y + V_GAP;

            layout(child.id, childCenterX, childY);

            currentX += childSubtreeWidth + MIN_H_GAP;
          });
        };

        // Find roots: ChatNodes with no incoming edges from other ChatNodes
        // (We ignore incoming edges from Notes if that ever happens)
        const treeNodes = nodes.filter((n) => n.type !== 'noteNode');
        const internalEdgeTargets = new Set(
          edges
            .filter((e) => {
              const source = nodes.find((n) => n.id === e.source);
              return source && source.type !== 'noteNode';
            })
            .map((e) => e.target)
        );

        const roots = treeNodes.filter((n) => !internalEdgeTargets.has(n.id));

        let currentRootX = 0;
        roots.forEach((root) => {
          const rootSubtreeWidth = calculateSubtreeWidth(root.id);
          const rootCenterX = currentRootX + rootSubtreeWidth / 2;
          layout(root.id, rootCenterX, 0);
          currentRootX += rootSubtreeWidth + MIN_H_GAP * 3;
        });

        // Notes that are NOT attached to anything should ideally stay put or be moved to a "scratchpad" area.
        // For now, if they are not processed by the recursive layout (because they are orphaned), they are left alone.
        // This is the desired behavior for "Global Notes".

        set({ nodes: newNodes });
        await get().forceSave();
      },

      clearCanvas: async () => {
        set({ nodes: [], edges: [] });
        await get().forceSave();
      },

      clearData: () => {
        useFlowStore.temporal.getState().clear();
        set({
          nodes: [],
          edges: [],
          editingNodeId: null,
          saveStatus: 'idle',
          areNotesHidden: false,
        });
      },

      createNote: (position) => {
        const newNodeId = nanoid();
        const newNode: NoteTreeNode = {
          id: newNodeId,
          type: 'noteNode',
          position,
          data: {
            label: 'New Note',
            content: '',
            type: 'note',
            createdAt: Date.now(),
            isHidden: false,
          },
          style: { width: 300, height: 200 },
          dragHandle: '.custom-drag-handle',
        };

        set({
          nodes: [...get().nodes, newNode],
        });
        get().forceSave();
      },

      toggleNoteVisibility: (nodeId) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, isHidden: !node.data.isHidden } }
              : node
          ),
        });
      },

      toggleAllNotesVisibility: () => {
        const { areNotesHidden, nodes } = get();
        const newHiddenState = !areNotesHidden;

        set({
          areNotesHidden: newHiddenState,
          nodes: nodes.map((node) =>
            node.data.type === 'note'
              ? { ...node, data: { ...node.data, isHidden: newHiddenState } }
              : node
          ),
        });
      },
    }),
    {
      limit: 200,
      handleSet: (handleSet) => debounce(handleSet, 500),
      partialize: (state) => ({
        nodes: state.nodes.map((node) => ({
          ...node,
          selected: false,
          dragging: false,
        })),
        edges: state.edges,
        areNotesHidden: state.areNotesHidden,
      }),
    }
  )
);
