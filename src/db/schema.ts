import Dexie, { type EntityTable } from 'dexie';
import { APP_NAME } from '../config';
import { DBNode, DBEdge, Project } from '../types';

export const db = new Dexie(`${APP_NAME}DB`) as Dexie & {
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
