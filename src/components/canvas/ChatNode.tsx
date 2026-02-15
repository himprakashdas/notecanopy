import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from '@xyflow/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Plus, Trash2, Send, Square, Copy, Check, StickyNote, Maximize } from 'lucide-react';
import { NoteTreeNode } from '../../types';
import { useFlowStore } from '../../store/useFlowStore';
import { useAIStore } from '../../store/useAIStore';
import { useAppStore } from '../../store/useAppStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Tooltip } from '../ui/Tooltip';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const ChatNode = ({ id, data, selected }: NodeProps<NoteTreeNode>) => {
  const [copied, setCopied] = useState(false);
  const isUser = data.type === 'user';
  const addBranch = useFlowStore((state) => state.addBranch);
  const addAIChild = useFlowStore((state) => state.addAIChild);
  const setDeletingNodeId = useFlowStore((state) => state.setDeletingNodeId);
  const setEditingNodeId = useFlowStore((state) => state.setEditingNodeId);
  const stopGeneration = useAIStore((state) => state.stopGeneration);
  const fontSize = useAppStore((state) => state.fontSize);
  const updateNodeContent = useFlowStore((state) => state.updateNodeContent);
  const { setCenter } = useReactFlow();
  const [localEditMode, setLocalEditMode] = useState(isUser && data.label === '' && !data.thinking);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-enter edit mode if it's a new user node (empty label)

  useEffect(() => {
    if (localEditMode && textareaRef.current) {
      // Small delay to ensure React Flow has finished its own focus handling
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        // Move cursor to end
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [localEditMode]);

  const handleAddBranch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newNode = await addBranch(id);
    if (newNode) {
      setCenter(newNode.position.x + 125, newNode.position.y + 100, {
        duration: 800,
        zoom: 1,
      });
    }
  };

  const handleAddAIChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newNode = await addAIChild(id);
    if (newNode) {
      setCenter(newNode.position.x + 125, newNode.position.y + 100, {
        duration: 800,
        zoom: 1,
      });
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingNodeId(id);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStopConfirm(true);
  };

  const confirmStop = () => {
    stopGeneration(id);
    setShowStopConfirm(false);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data.label) return;

    try {
      await navigator.clipboard.writeText(data.label);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <>
      <NodeResizer
        color="var(--color-brand-primary)"
        isVisible={selected}
        minWidth={200}
        minHeight={80}
        maxWidth={2000}
        maxHeight={3000}
      />
      <div
        className={twMerge(
          clsx(
            'group px-4 py-3 rounded-lg border-2 h-full w-full transition-all relative flex flex-col',
            'bg-surface text-zinc-100 shadow-xl',
            isUser ? 'border-zinc-700' : 'border-primary/50',
            selected && (isUser ? 'border-zinc-400' : 'border-primary'),
            !isUser && 'bg-primary/10',
            data.thinking && 'opacity-80',
            localEditMode && 'ring-2 ring-primary/50 border-primary'
          )
        )}
        onKeyDown={(e) => {
          if (
            selected &&
            !localEditMode &&
            isUser &&
            e.key === 'Enter' &&
            !e.metaKey &&
            !e.ctrlKey
          ) {
            e.preventDefault();
            setLocalEditMode(true);
          }
        }}
        onDoubleClick={() => {
          if (isUser && !localEditMode) {
            setLocalEditMode(true);
          }
        }}
        tabIndex={0}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="w-2 h-2 !bg-zinc-600 border-none"
        />

        <div className="flex items-center justify-between mb-1 shrink-0">
          <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
            {isUser ? 'User' : 'Assistant'}
          </div>
          <div className="flex items-center gap-1">
            {!isUser && !data.thinking && data.label && (
              <Tooltip content="Copy to clipboard" position="right">
                <button
                  onClick={handleCopy}
                  className={`p-1 rounded transition-all ${
                    copied
                      ? 'text-emerald-400 bg-emerald-500/20'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </Tooltip>
            )}
            <Tooltip content="Expand to overlay" position="right">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingNodeId(id);
                }}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
              >
                <Maximize className="w-3 h-3" />
              </button>
            </Tooltip>
          </div>
        </div>

        <div
          className={twMerge(
            'flex-grow whitespace-pre-wrap overflow-y-auto custom-scrollbar pr-1 markdown-content nowheel',
            fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'
          )}
        >
          {data.thinking ? (
            <div className="flex flex-col gap-2">
              <span className="italic text-zinc-500 animate-pulse">Thinking...</span>
              {data.label && (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {data.label}
                </ReactMarkdown>
              )}
            </div>
          ) : isUser && localEditMode ? (
            <textarea
              ref={textareaRef}
              autoFocus
              className={twMerge(
                'w-full h-full bg-transparent border-none outline-none resize-none text-zinc-100 placeholder-zinc-700 custom-scrollbar nodrag nopan Nowheel',
                fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'
              )}
              value={data.label}
              onChange={(e) => updateNodeContent(id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setLocalEditMode(false);
                }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  setLocalEditMode(false);
                  handleAddAIChild(e as unknown as React.MouseEvent);
                }
                if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                  // Just normal Enter to exit edit mode?
                  // Or leave it for multiline and use Escape to exit?
                  // User said "clicking enter while user node is in focus takes it into edit mode"
                  // Usually Enter to save. Let's make Enter save/exit, Shift+Enter for newline.
                  e.preventDefault();
                  setLocalEditMode(false);
                }
              }}
              placeholder="Type your prompt..."
            />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {data.label || ''}
            </ReactMarkdown>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          className="w-2 h-2 !bg-zinc-600 border-none"
        />

        {/* Triple-Action Hover Bar */}
        <div
          className={clsx(
            'absolute -bottom-5 left-1/2 -translate-x-1/2',
            'flex items-center gap-1 p-1 rounded-full bg-zinc-800 border border-zinc-700',
            'opacity-0 group-hover:opacity-100 transition-opacity z-10',
            'shadow-lg'
          )}
        >
          {data.thinking ? (
            <Tooltip content="Stop Generation" position="bottom">
              <button
                onClick={handleStop}
                className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:text-primary/80 hover:bg-zinc-700 transition-colors"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            </Tooltip>
          ) : (
            <>
              <Tooltip content="Delete node" position="bottom">
                <button
                  onClick={handleDelete}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Add User child" position="bottom">
                <button
                  onClick={handleAddBranch}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Attach Note" position="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useFlowStore.getState().addNoteChild(id);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-secondary hover:bg-zinc-700 transition-colors"
                >
                  <StickyNote className="w-4 h-4" />
                </button>
              </Tooltip>

              {isUser && (
                <Tooltip content="Add AI child" position="bottom">
                  <button
                    onClick={handleAddAIChild}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-primary hover:bg-zinc-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showStopConfirm}
        onClose={() => setShowStopConfirm(false)}
        onConfirm={confirmStop}
        title="Stop Response"
        message="Are you sure you want to stop the AI response? This will keep the current partial output."
        confirmLabel="Stop Responding"
        confirmVariant="danger"
      />
    </>
  );
};

export default memo(ChatNode);
