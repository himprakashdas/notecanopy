import Dexie, { type EntityTable } from 'dexie';
import { Project, DBNode, DBEdge } from '../types';

export const db = new Dexie('NoteTreeDB') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  nodes: EntityTable<DBNode, 'id'>;
  edges: EntityTable<DBEdge, 'id'>;
};

db.version(1).stores({
  projects: 'id, lastModified',
  nodes: 'id, projectId',
  edges: 'id, projectId, [projectId+id]',
});

export default db;
