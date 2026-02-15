import { nanoid } from 'nanoid';
import { Project, NoteCanopyNode, NoteCanopyEdge, DBNode, DBEdge } from '../types';
import { db } from '../db/schema';

interface ExportData {
  project: Project;
  nodes: NoteCanopyNode[];
  edges: NoteCanopyEdge[];
  version: string;
  exportDate: string;
}

/**
 * Helper to reassign all IDs in a project's nodes and edges to prevent collisions.
 * Preserves the graph structure by mapping old IDs to new ones.
 */
const prepareImportData = (
  nodes: NoteCanopyNode[],
  edges: NoteCanopyEdge[],
  projectId: string
): { newNodes: DBNode[]; newEdges: DBEdge[] } => {
  const nodeIdMap = new Map<string, string>();

  // 1. Generate new IDs for all nodes and create a mapping
  const newNodes: DBNode[] = nodes.map((node) => {
    const newId = nanoid();
    nodeIdMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
      projectId,
    };
  });

  // 2. Map edges to new node IDs and generate new edge IDs
  const newEdges: DBEdge[] = edges.map((edge) => ({
    ...edge,
    id: nanoid(),
    source: nodeIdMap.get(edge.source) || edge.source,
    target: nodeIdMap.get(edge.target) || edge.target,
    projectId,
  }));

  return { newNodes, newEdges };
};

/**
 * Validates and imports a project from a JSON string.
 */
export const importProjectFromJSON = async (jsonString: string): Promise<Project> => {
  let data: ExportData;

  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON format', { cause: error });
  }

  if (!data.project || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid project file structure');
  }

  const newProjectId = nanoid();
  const now = Date.now();

  const newProject: Project = {
    ...data.project,
    id: newProjectId,
    name: `${data.project.name} (Imported)`,
    createdAt: now,
    lastModified: now,
  };

  const { newNodes, newEdges } = prepareImportData(data.nodes, data.edges, newProjectId);

  await db.transaction('rw', [db.projects, db.nodes, db.edges], async () => {
    await db.projects.add(newProject);
    await db.nodes.bulkAdd(newNodes);
    await db.edges.bulkAdd(newEdges);
  });

  return newProject;
};

/**
 * Overwrites an existing project with data from a JSON string.
 */
export const importIntoProject = async (projectId: string, jsonString: string): Promise<void> => {
  let data: ExportData;

  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON format', { cause: error });
  }

  if (!data.project || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid project file structure');
  }

  const now = Date.now();
  const { newNodes, newEdges } = prepareImportData(data.nodes, data.edges, projectId);

  await db.transaction('rw', [db.projects, db.nodes, db.edges], async () => {
    await db.projects.update(projectId, {
      systemPrompt: data.project.systemPrompt,
      model: data.project.model,
      lastModified: now,
    });

    await db.nodes.where('projectId').equals(projectId).delete();
    await db.edges.where('projectId').equals(projectId).delete();

    await db.nodes.bulkAdd(newNodes);
    await db.edges.bulkAdd(newEdges);
  });
};
