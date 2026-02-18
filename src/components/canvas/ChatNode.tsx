import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from '@xyflow/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Plus, Trash2, Send, Square, Copy, Check, StickyNote, Maximize } from 'lucide-react';
import { NoteCanopyNode, Tag } from '../../types';
import { useFlowStore } from '../../store/useFlowStore';
import { useAIStore } from '../../store/useAIStore';
import { useAppStore } from '../../store/useAppStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Tooltip } from '../ui/Tooltip';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { CodeBlock } from '../ui/CodeBlock';
import { TagModal } from '../ui/TagModal';

const ChatNode = ({ id, data, selected, width, height }: NodeProps<NoteCanopyNode>) => {
  const [copied, setCopied] = useState(false);
  const isUser = data.type === 'user';
  const addBranch = useFlowStore((state) => state.addBranch);
  const addAIChild = useFlowStore((state) => state.addAIChild);
  const setDeletingNodeId = useFlowStore((state) => state.setDeletingNodeId);
  const setEditingNodeId = useFlowStore((state) => state.setEditingNodeId);
  const stopGeneration = useAIStore((state) => state.stopGeneration);
  const fontSize = useAppStore((state) => state.fontSize);
  const updateNodeContent = useFlowStore((state) => state.updateNodeContent);
  const addTag = useFlowStore((state) => state.addTag);
  const removeTag = useFlowStore((state) => state.removeTag);
  const { setCenter } = useReactFlow();
  const [localEditMode, setLocalEditMode] = useState(isUser && data.label === '' && !data.thinking);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showKeyboardTip, setShowKeyboardTip] = useState(() => {
    const hasUsedShortcut = localStorage.getItem('hasUsedCmdEnterInline');
    return !hasUsedShortcut;
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // CRITICAL: Use top-level height prop from React Flow for reliable resize detection
  const isManuallyResized = typeof height === 'number';

  const handleAddTag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTagModal(true);
  };

  const onTagConfirm = (tag: Tag) => {
    addTag(id, tag);
  };

  useEffect(() => {
    if (localEditMode && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
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

  // Determine height classes based on state
  // If it's a User node OR manually resized, allow 100% height (h-full).
  // If it's an Assistant node NOT manually resized, use auto-height with the 562px cap.
  const heightClasses = (isUser || isManuallyResized) 
    ? 'h-full' 
    : 'h-auto max-h-[562px] min-h-[80px]';

  return (
    <div
      className={twMerge(
        clsx(
          'group px-4 py-3 rounded-lg border-2 w-full transition-shadow relative flex flex-col',
          'bg-surface text-text-main shadow-xl',
          heightClasses,
          isUser ? 'border-border' : 'border-primary/50',
          selected && (isUser ? 'border-border-accent' : 'border-primary'),
          !isUser && 'bg-primary/5',
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
      style={{ 
        height: '100%', 
        width: '100%',
        maxHeight: (isUser || isManuallyResized) ? 'none' : '562px'
      }}
    >
      <NodeResizer
        color="var(--color-brand-primary)"
        isVisible={selected}
        minWidth={200}
        minHeight={80}
        maxWidth={3000}
        maxHeight={5000}
      />
      
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-border border-none"
      />

      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex flex-col">
          <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted">
            {isUser ? 'User' : 'Assistant'}
          </div>
          {/* Tags Display */}
          <div className="flex flex-wrap gap-1 mt-1">
            {(data.tags || []).map((tag) => (
              <span
                key={tag.label}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase border border-white/10 flex items-center gap-1 group/tag"
                style={{ backgroundColor: tag.color }}
              >
                {tag.label}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(id, tag.label);
                  }}
                  className="opacity-0 group-hover/tag:opacity-100 hover:text-white/80 transition-opacity"
                >
                  ×
                </button>
              </span>
            ))}
            {!localEditMode && (
              <button
                onClick={handleAddTag}
                className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface transition-all"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isUser && !data.thinking && data.label && (
            <Tooltip content="Copy to clipboard" position="right">
              <button
                onClick={handleCopy}
                className={`p-1 rounded transition-all ${
                  copied
                    ? 'text-emerald-400 bg-emerald-500/20'
                    : 'text-text-muted hover:text-text-main hover:bg-surface'
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
              className="p-1 rounded text-text-muted hover:text-text-main hover:bg-surface transition-all"
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
            <span className="italic text-text-muted animate-pulse">Thinking...</span>
            {data.label && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                  code(props) {
                    const { children, className, node, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                    ) : (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {data.label}
              </ReactMarkdown>
            )}
          </div>
        ) : isUser && localEditMode ? (
          <textarea
            ref={textareaRef}
            autoFocus
            className={twMerge(
              'w-full h-full bg-transparent border-none outline-none resize-none text-text-main placeholder-text-dim custom-scrollbar nodrag nopan Nowheel',
              fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'
            )}
            value={data.label}
            onChange={(e) => updateNodeContent(id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setLocalEditMode(false);
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                if (showKeyboardTip) {
                  setShowKeyboardTip(false);
                  localStorage.setItem('hasUsedCmdEnterInline', 'true');
                }
                setLocalEditMode(false);
                handleAddAIChild(e as unknown as React.MouseEvent);
              }
              if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                setLocalEditMode(false);
              }
            }}
            placeholder="Type your prompt..."
          />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              code(props) {
                const { children, className, node, ...rest } = props;
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                ) : (
                  <code {...rest} className={className}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {data.label || ''}
          </ReactMarkdown>
        )}
      </div>

      {isUser && localEditMode && showKeyboardTip && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-primary text-[10px] font-medium animate-pulse pointer-events-none z-20">
          <kbd className="px-1 py-0.5 bg-primary/20 rounded text-[9px] font-bold">⌘Enter</kbd>
          <span>to go</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-zinc-600 border-none"
      />

      <div
        className={clsx(
          'absolute -bottom-5 left-1/2 -translate-x-1/2',
          'flex items-center gap-1 p-1 rounded-full bg-overlay border border-border',
          'opacity-0 group-hover:opacity-100 transition-opacity z-10',
          'shadow-lg'
        )}
      >
        {data.thinking ? (
          <Tooltip content="Stop Generation" position="bottom">
            <button
              onClick={handleStop}
              className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:text-primary/80 hover:bg-surface transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </Tooltip>
        ) : (
          <>
            <Tooltip content="Delete node" position="bottom">
              <button
                  onClick={handleDelete}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-surface transition-colors"
                >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Add User child" position="bottom">
              <button
                  onClick={handleAddBranch}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface transition-colors"
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
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-secondary hover:bg-surface transition-colors"
                >
                <StickyNote className="w-4 h-4" />
              </button>
            </Tooltip>

            {isUser && (
              <Tooltip content="Add AI child" position="bottom">
                <button
                  onClick={handleAddAIChild}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-primary hover:bg-surface transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </>
        )}
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

      <TagModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onConfirm={onTagConfirm}
      />
    </div>
  );
};

export default memo(ChatNode);
