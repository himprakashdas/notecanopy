import { create } from 'zustand';
import { ContextSnapshot, getGenAIClient, countTokens } from '../utils/ai';
import { useFlowStore } from './useFlowStore';
import { projectRepository } from '../db/repository';
import { useAppStore } from './useAppStore';
import { toast } from 'sonner';
import { getReadableErrorMessage } from '../utils/errorMessages';

interface QueueItem {
  nodeId: string;
  snapshot: ContextSnapshot;
}

interface AIState {
  queue: QueueItem[];
  isProcessing: boolean;
  abortControllers: Record<string, AbortController>;
  enqueue: (nodeId: string, snapshot: ContextSnapshot) => void;
  processNext: () => Promise<void>;
  stopGeneration: (nodeId: string) => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  queue: [],
  isProcessing: false,
  abortControllers: {},

  enqueue: (nodeId: string, snapshot: ContextSnapshot) => {
    set((state) => ({
      queue: [...state.queue, { nodeId, snapshot }],
    }));
    get().processNext();
  },

  stopGeneration: (nodeId: string) => {
    const { abortControllers } = get();

    // 1. Abort if currently processing
    if (abortControllers[nodeId]) {
      abortControllers[nodeId].abort();
    }

    // 2. Remove from queue if pending (not currently processing)
    set((state) => ({
      queue: state.queue.filter((item, index) => {
        // If it's currently processing (index 0), keep it so processNext can clean it up
        if (index === 0 && state.isProcessing && item.nodeId === nodeId) return true;
        return item.nodeId !== nodeId;
      }),
      // Clean up controller record if it's not the one processing
      abortControllers: Object.fromEntries(
        Object.entries(state.abortControllers).filter(
          ([id]) => id !== nodeId || (state.isProcessing && state.queue[0]?.nodeId === id)
        )
      ),
    }));

    // 3. Stop thinking and save partial content
    useFlowStore.getState().updateNodeThinking(nodeId, false);
    useFlowStore.getState().forceSave();
  },

  processNext: async () => {
    const { isProcessing, queue } = get();
    if (isProcessing || queue.length === 0) return;

    set({ isProcessing: true });

    const item = queue[0];
    const { nodeId, snapshot } = item;

    // Add abort controller for this node
    const controller = new AbortController();
    set((state) => ({
      abortControllers: { ...state.abortControllers, [nodeId]: controller },
    }));

    const activeProject = useAppStore.getState().activeProject;
    const modelName = activeProject?.model || 'gemini-3-flash-preview';

    let retryCount = 0;
    const maxRetries = 3;
    const backoff = [1000, 2000, 4000];

    try {
      while (retryCount <= maxRetries) {
        let accumulatedText = '';
        try {
          if (controller.signal.aborted) break;

          if (import.meta.env.DEV) {
            console.log(`[AI Queue] Processing node ${nodeId} (Attempt ${retryCount + 1})...`);
          }

          const geminiApiKey = useAppStore.getState().geminiApiKey;
          if (!geminiApiKey) {
            toast.error('Gemini API key is required. Please add it in Project Settings.', {
              duration: 5000,
            });
            useFlowStore.getState().updateNodeThinking(nodeId, false);
            useFlowStore.getState().deleteNodeOnly(nodeId);
            break;
          }

          const client = getGenAIClient(geminiApiKey);
          const history = snapshot.history;

          if (history.length === 0) {
            throw new Error('No message history found for AI generation');
          }

          // Task 3: Token Counting Integration
          const tokenCount = await countTokens(
            geminiApiKey,
            modelName,
            history,
            snapshot.systemPrompt
          );
          if (import.meta.env.DEV) {
            console.log(`[AI Queue] Prompt tokens: ${tokenCount}`);
          }

          // Task 2: "Resume" Logic - if we have accumulated text from a previous failed attempt,
          // we could potentially append it. But for now, we just retry the full generation.
          // If we wanted to "resume", we'd need to handle partial turns.

          const isDeepThink = modelName === 'gemini-3-pro-deep-think-preview';
          const actualModelName = isDeepThink ? 'gemini-3-pro-preview' : modelName;

          const result = await client.models.generateContentStream({
            model: actualModelName,
            config: {
              systemInstruction: snapshot.systemPrompt,
              thinking: isDeepThink ? { thinking_level: 'high' } : undefined,
            } as Record<string, unknown>,
            contents: history,
          });

          let chunkCount = 0;
          let isFirstChunk = true;
          let wasSafetyBlocked = false;

          // Reset accumulated text for this attempt if we want a fresh start,
          // or keep it if we implement true resume.

          for await (const chunk of result) {
            if (controller.signal.aborted) break;

            // Safety Filter Handling
            // In @google/genai, we check chunk.candidates[0].finishReason
            const candidate = chunk.candidates?.[0];
            const finishReason = candidate?.finishReason;

            if (finishReason === 'SAFETY') {
              accumulatedText +=
                '\n\n⚠️ Content Blocked: This response was filtered by safety settings.';
              useFlowStore.getState().updateNodeContent(nodeId, accumulatedText);
              useFlowStore.getState().updateNodeThinking(nodeId, false);
              if (activeProject?.id) {
                await projectRepository.updateNodeContent(
                  activeProject.id,
                  nodeId,
                  accumulatedText
                );
              }
              wasSafetyBlocked = true;
              break;
            }

            let chunkText = '';
            try {
              chunkText = chunk.text || '';
            } catch (e) {
              console.warn('Could not get text from chunk (might be blocked):', e);
            }

            accumulatedText += chunkText;
            chunkCount++;

            // Update UI
            useFlowStore.getState().updateNodeContent(nodeId, accumulatedText);

            if (isFirstChunk) {
              useFlowStore.getState().updateNodeThinking(nodeId, false);
              isFirstChunk = false;
            }

            // Throttled Persistence (every 10 chunks)
            if (activeProject?.id && chunkCount % 10 === 0) {
              projectRepository.updateNodeContent(activeProject.id, nodeId, accumulatedText);
            }
          }

          if (controller.signal.aborted) {
            if (import.meta.env.DEV) {
              console.log(`[AI Queue] Generation for ${nodeId} aborted by user.`);
            }
            break;
          }

          if (wasSafetyBlocked) {
            break; // Exit retry loop on safety block
          }

          // Final save
          if (activeProject?.id) {
            await projectRepository.updateNodeContent(activeProject.id, nodeId, accumulatedText);
          }

          if (import.meta.env.DEV) {
            console.log(`[AI Queue] Finished node ${nodeId}`);
          }
          break; // Success
        } catch (error: unknown) {
          if (controller.signal.aborted) break;

          console.error(`[AI Queue] Error on attempt ${retryCount + 1}:`, error);

          const errorMessage = error instanceof Error ? error.message : String(error);

          const err = error as { status?: number };
          const isAuthError =
            err.status === 401 ||
            errorMessage.toLowerCase().includes('unauthorized') ||
            errorMessage.toLowerCase().includes('api key');
          const isQuotaError = err.status === 429 || errorMessage.toLowerCase().includes('quota');

          if (isAuthError) {
            toast.error(getReadableErrorMessage('Invalid API key'), { duration: 5000 });
            useFlowStore.getState().updateNodeThinking(nodeId, false);
            useFlowStore.getState().deleteNodeOnly(nodeId);
            break;
          }

          if (isQuotaError) {
            toast.error(getReadableErrorMessage('API quota exceeded'), { duration: 5000 });
            useFlowStore.getState().updateNodeThinking(nodeId, false);
            useFlowStore.getState().deleteNodeOnly(nodeId);
            break;
          }

          // Connectivity error check
          const isConnectivityError =
            err.status === 503 ||
            err.status === 504 ||
            errorMessage.includes('fetch failed') ||
            errorMessage.includes('Network Error') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('Deadline Exceeded');

          if (isConnectivityError && retryCount < maxRetries) {
            const delayTime = backoff[retryCount];
            useFlowStore
              .getState()
              .updateNodeContent(nodeId, `Retrying in ${delayTime / 1000}s...`);
            await new Promise((resolve) => setTimeout(resolve, delayTime));
            retryCount++;
          } else {
            // Final failure
            toast.error(getReadableErrorMessage(error), { duration: 5000 });
            useFlowStore.getState().updateNodeThinking(nodeId, false);
            useFlowStore.getState().deleteNodeOnly(nodeId);
            break;
          }
        }
      }
    } finally {
      // Cleanup controller
      set((state) => {
        const newControllers = { ...state.abortControllers };
        delete newControllers[nodeId];
        return { abortControllers: newControllers };
      });

      set((state) => ({
        queue: state.queue.slice(1),
        isProcessing: false,
      }));
      // Recurse to process next item
      get().processNext();
    }
  },
}));
