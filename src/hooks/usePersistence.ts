import { useEffect, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { useAppStore } from '../store/useAppStore';
import { projectRepository } from '../db/repository';

export function usePersistence() {
  const { nodes, edges } = useFlowStore();
  const { activeProject } = useAppStore();
  const activeProjectId = activeProject?.id;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeProjectId) return;

    // Debounce save
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Access store directly for status updates to avoid re-triggering this effect

      try {
        await projectRepository.saveNodes(activeProjectId, nodes);
        await projectRepository.saveEdges(activeProjectId, edges);
        await projectRepository.updateProject(activeProjectId, {}); // Update lastModified

        // Show saved status briefly
        useFlowStore.setState({ saveStatus: 'saved' });
        setTimeout(() => useFlowStore.setState({ saveStatus: 'idle' }), 2000);
      } catch (error) {
        console.error('Failed to auto-save:', error);
      }
    }, 60000); // 1 minute debounce for auto-save

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, activeProjectId]);
}
