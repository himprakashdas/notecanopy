import { NoteCanopyNode, NoteCanopyEdge } from '../types';
import { projectRepository } from '../db/repository';
import { GoogleGenAI } from '@google/genai';

const getClient = (apiKey: string) => new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });

export const getGeminiModelName = (modelName = 'gemini-3-flash-preview') => {
  return modelName;
};

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ContextSnapshot {
  systemPrompt: string;
  history: GeminiMessage[];
}

/**
 * Formats context nodes into Gemini-compatible history.
 * Merges consecutive messages with the same role to ensure alternating roles.
 */
export function formatPrompt(systemPrompt: string, contextNodes: NoteCanopyNode[]): GeminiMessage[] {
  const messages: GeminiMessage[] = [];

  contextNodes.forEach((node) => {
    const text = node.data.label + (node.data.content ? `\n\n${node.data.content}` : '');
    if (!text.trim()) return;

    const role = node.data.type === 'ai' ? 'model' : 'user';
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === role) {
      // Merge with last message if same role
      lastMessage.parts[0].text += `\n\n---\n\n${text}`;
    } else {
      messages.push({
        role,
        parts: [{ text }],
      });
    }
  });

  return messages;
}

/**
 * Creates a snapshot of the context for a given node.
 */
export async function createContextSnapshot(
  projectId: string,
  nodeId: string,
  nodes?: NoteCanopyNode[],
  edges?: NoteCanopyEdge[]
): Promise<ContextSnapshot> {
  const { systemPrompt, contextNodes } = await projectRepository.getAIContext(
    projectId,
    nodeId,
    nodes,
    edges
  );

  return {
    systemPrompt,
    history: formatPrompt(systemPrompt, contextNodes),
  };
}

/**
 * Helper to get the GenAI client instance
 */
export const getGenAIClient = (apiKey: string) => getClient(apiKey);

/**
 * SDK-native token counting
 */
export async function countTokens(
  apiKey: string,
  model = 'gemini-3-flash-preview',
  contents: GeminiMessage[],
  systemInstruction?: string
) {
  try {
    const client = getClient(apiKey);
    const response = await client.models.countTokens({
      model,
      contents,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    return response.totalTokens;
  } catch (error) {
    console.error('Error counting tokens:', error);
    return 0;
  }
}
