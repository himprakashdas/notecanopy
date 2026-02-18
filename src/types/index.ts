import { Node, Edge } from '@xyflow/react';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  systemPrompt: string;
  model: string;
}

export interface Tag {
  label: string;
  color: string;
}

export interface NodeData extends Record<string, unknown> {
  label: string; // The text content shown in the node
  content: string; // The fuller content (sometimes used for hidden prompts)
  type: 'user' | 'ai' | 'note';
  thinking?: boolean;
  createdAt: number;
  isHidden?: boolean;
  color?: string;
  tags?: Tag[];
}

export type NoteCanopyNode = Node<NodeData>;
export type NoteCanopyEdge = Edge;

export interface DBNode extends NoteCanopyNode {
  projectId: string;
}

export interface DBEdge extends NoteCanopyEdge {
  projectId: string;
}
