import { Project, NoteTreeNode, NoteTreeEdge } from '../types';

/**
 * Downloads a string content as a file in the browser.
 */
export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exports the project data to a JSON string.
 */
export const exportToJSON = (
  project: Project,
  nodes: NoteTreeNode[],
  edges: NoteTreeEdge[]
): string => {
  const data = {
    project,
    nodes,
    edges,
    version: '1.0',
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
};

/**
 * Exports the project data to a Markdown string, preserving the tree structure.
 */
export const exportToMarkdown = (
  project: Project,
  nodes: NoteTreeNode[],
  edges: NoteTreeEdge[]
): string => {
  if (!nodes.length) return `# ${project.name}\n\n(No content)`;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  // Build parent-child relationships
  edges.forEach((edge) => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
    parentMap.set(edge.target, edge.source);
  });

  // Find root nodes (nodes with no parents)
  const roots = nodes.filter((n) => !parentMap.has(n.id));

  // Sort roots by creation time if available, or just keeping order
  roots.sort((a, b) => (a.data.createdAt || 0) - (b.data.createdAt || 0));

  let md = `# ${project.name}\n\n`;
  md += `*Exported on ${new Date().toLocaleDateString()}*\n\n---\n\n`;

  const traverse = (nodeId: string, depth: number) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    // Indentation/Header level
    // We limit header levels to 6 (# to ######)
    // Deeper levels can use bullet points or blockquotes
    const headerPrefix = '#'.repeat(Math.min(depth + 1, 6));

    const role = node.data.type === 'user' ? 'User' : 'AI';
    const label = node.data.label || '(Empty Node)';

    // Formatting the node content
    md += `${headerPrefix} ${role} (${new Date(node.data.createdAt).toLocaleTimeString()})\n\n`;

    // Add content as blockquote for better readability or just text
    md += `${label}\n\n`;

    // Process children
    const children = childrenMap.get(nodeId) || [];
    // Sort children by creation time potentially? The edge order might strictly dictate it but usually DAGs are ordered by insertion.
    // We'll trust the order they appear or sort by position/creation if needed.
    // For now, let's sort by createdAt to be safe if available.
    children.sort((a, b) => {
      const nodeA = nodeMap.get(a);
      const nodeB = nodeMap.get(b);
      return (nodeA?.data.createdAt || 0) - (nodeB?.data.createdAt || 0);
    });

    children.forEach((childId) => traverse(childId, depth + 1));
  };

  roots.forEach((root) => traverse(root.id, 1));

  return md;
};
