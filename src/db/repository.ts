import { db } from './schema';
import { Project, NoteTreeNode, NoteTreeEdge, DBNode, DBEdge } from '../types';
import { nanoid } from 'nanoid';

export const projectRepository = {
  async getAllProjects() {
    return db.projects.orderBy('lastModified').reverse().toArray();
  },

  async createProject(name: string): Promise<Project> {
    const now = Date.now();
    const project: Project = {
      id: nanoid(),
      name,
      createdAt: now,
      lastModified: now,
      systemPrompt:
        'You are a helpful creative writing assistant that helps brainstorm and organize ideas in a tree structure. Format your responses in Markdown. IMPORTANT: Use standard bullet points for lists. Do NOT use code blocks for lists or text. Use 2-space indentation for nested lists, NEVER 4 spaces.',
      model: 'gemini-3-flash-preview',
    };
    await db.projects.add(project);
    return project;
  },

  async deleteProject(id: string) {
    return db.transaction('rw', [db.projects, db.nodes, db.edges], async () => {
      await db.nodes.where('projectId').equals(id).delete();
      await db.edges.where('projectId').equals(id).delete();
      await db.projects.delete(id);
    });
  },

  async updateProject(id: string, updates: Partial<Project>) {
    return db.projects.update(id, {
      ...updates,
      lastModified: Date.now(),
    });
  },

  // Node & Edge persistence
  async saveNodes(projectId: string, nodes: NoteTreeNode[]) {
    return db.transaction('rw', db.nodes, async () => {
      // Clear all existing nodes for this project before saving current state
      await db.nodes.where('projectId').equals(projectId).delete();
      const dbNodes: DBNode[] = nodes.map((node) => ({
        ...node,
        projectId,
      }));
      return db.nodes.bulkPut(dbNodes);
    });
  },

  async saveEdges(projectId: string, edges: NoteTreeEdge[]) {
    return db.transaction('rw', db.edges, async () => {
      // Clear all existing edges for this project before saving current state
      await db.edges.where('projectId').equals(projectId).delete();
      const dbEdges: DBEdge[] = edges.map((edge) => ({
        ...edge,
        projectId,
      }));
      return db.edges.bulkPut(dbEdges);
    });
  },

  async getProjectData(projectId: string) {
    const nodes = await db.nodes.where('projectId').equals(projectId).toArray();
    const edges = await db.edges.where('projectId').equals(projectId).toArray();
    return { nodes, edges };
  },

  async updateNodeContent(projectId: string, nodeId: string, label: string) {
    const node = await db.nodes.get(nodeId);
    if (node && node.projectId === projectId) {
      return db.nodes.update(nodeId, {
        data: { ...node.data, label },
      });
    }
  },

  async getAIContext(
    projectId: string,
    parentNodeId: string,
    providedNodes?: NoteTreeNode[],
    providedEdges?: NoteTreeEdge[]
  ): Promise<{ systemPrompt: string; contextNodes: NoteTreeNode[] }> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const allNodes =
      providedNodes ||
      ((await db.nodes.where('projectId').equals(projectId).toArray()) as NoteTreeNode[]);
    const allEdges = (providedEdges ||
      (await db.edges.where('projectId').equals(projectId).toArray())) as NoteTreeEdge[];

    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
    const parentToChildren = new Map<string, string[]>();
    const childToParent = new Map<string, string>();

    allEdges.forEach((edge) => {
      if (!parentToChildren.has(edge.source)) {
        parentToChildren.set(edge.source, []);
      }
      parentToChildren.get(edge.source)!.push(edge.target);
      childToParent.set(edge.target, edge.source);
    });

    // 1. Find Ancestor Path for parentNodeId (the direct line)
    const path: NoteTreeNode[] = [];
    let currentId: string | undefined = parentNodeId;
    while (currentId) {
      const node = nodeMap.get(currentId);
      if (node) {
        path.unshift(node);
        currentId = childToParent.get(currentId);
      } else {
        currentId = undefined;
      }
    }

    // 2. Pruning: Only provide the last 3 nodes for linear context
    // This removes horizontal "pollution" from siblings/uncles
    const contextNodes = path.slice(-3);

    return {
      systemPrompt: project.systemPrompt,
      contextNodes,
    };
  },
};
