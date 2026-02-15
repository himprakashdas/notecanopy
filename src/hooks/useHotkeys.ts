import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from '../store/useFlowStore';

/**
 * Custom hook to handle canvas-level keyboard shortcuts.
 */
export const useHotkeys = () => {
  const { getNodes, setCenter } = useReactFlow();
  const addBranch = useFlowStore((state) => state.addBranch);
  const addAIChild = useFlowStore((state) => state.addAIChild);
  const setDeletingNodeId = useFlowStore((state) => state.setDeletingNodeId);
  const forceSave = useFlowStore((state) => state.forceSave);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Avoid triggering shortcuts when typing in an input or textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const metaOrCtrl = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      // 2. Undo: Cmd+Z
      if (metaOrCtrl && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        useFlowStore.temporal.getState().undo();
        return;
      }

      // 3. Redo: Cmd+Shift+Z or Cmd+Y
      if ((metaOrCtrl && key === 'z' && event.shiftKey) || (metaOrCtrl && key === 'y')) {
        event.preventDefault();
        useFlowStore.temporal.getState().redo();
        return;
      }

      // 4. Save: Cmd+S or Ctrl+S
      if (metaOrCtrl && key === 's') {
        event.preventDefault();
        forceSave();
        return;
      }

      // 5. Trigger deletion modal for selected node
      if (event.key === 'Delete' || (event.key === 'Backspace' && event.metaKey)) {
        const selectedNodes = getNodes().filter((n) => n.selected);
        if (selectedNodes.length === 1) {
          setDeletingNodeId(selectedNodes[0].id);
        }
        return;
      }

      // 6. Cmd+Enter or Ctrl+Enter to branch from selected node
      if (metaOrCtrl && event.key === 'Enter') {
        event.preventDefault();
        const selectedNodes = getNodes().filter((n) => n.selected);
        if (selectedNodes.length === 1) {
          const selectedNode = selectedNodes[0];
          const parentId = selectedNode.id;

          if (selectedNode.data.thinking) return;

          (async () => {
            let newNode;
            if (selectedNode.data.type === 'user') {
              newNode = await addAIChild(parentId);
            } else {
              newNode = await addBranch(parentId);
            }

            if (newNode) {
              // Auto-pan to the new node
              setCenter(newNode.position.x + 125, newNode.position.y + 100, {
                duration: 800,
                zoom: 1,
              });
            }
          })();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [getNodes, addBranch, addAIChild, setCenter, setDeletingNodeId, forceSave]);
};
