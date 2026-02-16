import JSZip from 'jszip';
import { Project, NoteCanopyNode, NoteCanopyEdge } from '../types';
import { exportToJSON, exportToMarkdown } from './export';
import { projectRepository } from '../db/repository';

/**
 * Exports all projects as a zip file containing JSON and/or Markdown formats
 * @param projects - Array of projects to export
 * @param format - Export format: 'json', 'markdown', or 'both'
 */
export const exportAllProjects = async (
  projects: Project[],
  format: 'json' | 'markdown' | 'both' = 'both'
): Promise<void> => {
  if (projects.length === 0) {
    throw new Error('No projects to export');
  }

  const zip = new JSZip();

  // Create folders based on format
  const jsonFolder = (format === 'json' || format === 'both') ? zip.folder('json') : null;
  const markdownFolder = (format === 'markdown' || format === 'both') ? zip.folder('markdown') : null;

  // Process each project
  for (const project of projects) {
    try {
      // Fetch project data
      const { nodes, edges } = await projectRepository.getProjectData(project.id);

      // Sanitize filename
      const sanitizedName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      // Export as JSON if requested
      if (jsonFolder) {
        const jsonContent = exportToJSON(project, nodes, edges);
        jsonFolder.file(`${sanitizedName}.json`, jsonContent);
      }

      // Export as Markdown if requested
      if (markdownFolder) {
        const markdownContent = exportToMarkdown(project, nodes, edges);
        markdownFolder.file(`${sanitizedName}.md`, markdownContent);
      }
    } catch (error) {
      console.error(`Failed to export project ${project.name}:`, error);
      // Continue with other projects even if one fails
    }
  }

  // Generate the zip file
  const blob = await zip.generateAsync({ type: 'blob' });

  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Use current date and format for filename
  const timestamp = new Date().toISOString().split('T')[0];
  const formatSuffix = format === 'both' ? 'all' : format;
  a.download = `notecanopy_projects_${formatSuffix}_${timestamp}.zip`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
