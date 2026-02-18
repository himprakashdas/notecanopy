import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Code, FileText, Copy, Check } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from '../../store/useFlowStore';
import { useAppStore } from '../../store/useAppStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Tooltip } from '../ui/Tooltip';
import { CodeBlock } from '../ui/CodeBlock';

const ChatOverlay = () => {
  const { editingNodeId, setEditingNodeId, nodes, updateNodeContent, addAIChild } = useFlowStore();
  const { fontSize, setFontSize } = useAppStore();
  const { setCenter } = useReactFlow();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const editingNode = nodes.find((n) => n.id === editingNodeId);
  const isUser = editingNode?.data.type === 'user';
  const hasContent = (editingNode?.data.label?.trim().length ?? 0) > 0;

  const [showMarkdown, setShowMarkdown] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showKeyboardTip, setShowKeyboardTip] = useState(() => {
    // Check if user has used the keyboard shortcut before
    const hasUsedShortcut = localStorage.getItem('hasUsedCmdEnter');
    return !hasUsedShortcut;
  });

  useEffect(() => {
    if (editingNodeId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingNodeId]);

  const handleSend = React.useCallback(async () => {
    // Basic safety check
    if (!editingNodeId || !editingNode) return;

    // Only "send" and close if it's a user node with content
    if (isUser) {
      if (hasContent) {
        // Hide the keyboard tip and mark as used
        if (showKeyboardTip) {
          setShowKeyboardTip(false);
          localStorage.setItem('hasUsedCmdEnter', 'true');
        }
        
        const newNode = await addAIChild(editingNodeId);
        if (newNode) {
          setCenter(newNode.position.x + 125, newNode.position.y + 100, {
            duration: 800,
            zoom: 1,
          });
        }
        setEditingNodeId(null);
      }
      // If empty user prompt, we do nothing (prevent closure on Cmd+Enter)
    } else {
      // AI node - always allow closing
      setEditingNodeId(null);
    }
  }, [editingNodeId, editingNode, hasContent, isUser, addAIChild, setCenter, setEditingNodeId, showKeyboardTip]);

  const handleCopy = React.useCallback(async () => {
    if (!editingNode?.data.label) return;

    try {
      await navigator.clipboard.writeText(editingNode.data.label);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [editingNode]);

  // Handle keyboard shortcuts (Global ones like Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingNodeId) {
        setEditingNodeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingNodeId, setEditingNodeId]);

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  if (!editingNodeId || !editingNode) return null;

  const fontClasses: Record<'small' | 'medium' | 'large', string> = {
    small: 'text-sm',
    medium: 'text-xl',
    large: 'text-3xl',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 lg:p-24 bg-black/40 backdrop-blur-sm"
      onClick={() => setEditingNodeId(null)}
    >
      <div
        className="relative w-full max-w-4xl h-full max-h-[800px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleContainerKeyDown}
        tabIndex={-1} // Allow the container to catch key events if focused
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${editingNode.data.type === 'user' ? 'bg-zinc-400' : 'bg-primary'}`}
            />
            <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">
              {isUser ? 'Editing User Prompt' : 'Viewing AI Response'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {!isUser && (
              <>
                <Tooltip
                  content={showMarkdown ? 'Show raw text' : 'Show markdown'}
                  position="bottom"
                >
                  <button
                    onClick={() => setShowMarkdown(!showMarkdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-xs font-medium"
                  >
                    {showMarkdown ? (
                      <Code className="w-3.5 h-3.5" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    {showMarkdown ? 'Raw' : 'Markdown'}
                  </button>
                </Tooltip>
                <Tooltip content="Copy to clipboard" position="bottom">
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                      copied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </Tooltip>
              </>
            )}
            <div className="flex items-center bg-black border border-zinc-800 rounded-lg p-0.5">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <Tooltip
                  key={size}
                  content={`${size.charAt(0).toUpperCase() + size.slice(1)} Text`}
                  position="bottom"
                >
                  <button
                    onClick={() => setFontSize(size)}
                    className={`
                      px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all
                      ${
                        fontSize === size
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }
                    `}
                  >
                    {size[0]}
                  </button>
                </Tooltip>
              ))}
            </div>
            <Tooltip content="Close Editor" position="bottom">
              <button
                onClick={() => setEditingNodeId(null)}
                className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {isUser ? (
            <textarea
              ref={textareaRef}
              value={editingNode.data.label}
              onChange={(e) => updateNodeContent(editingNodeId, e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSend();
                }
              }}
              placeholder="Type your content here..."
              className={`w-full h-full bg-transparent text-zinc-100 ${fontClasses[fontSize]} leading-relaxed resize-none focus:outline-none placeholder:text-zinc-700`}
            />
          ) : showMarkdown ? (
            <div
              className={`markdown-content text-zinc-100 ${fontClasses[fontSize]} leading-relaxed`}
            >
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
                {editingNode.data.label}
              </ReactMarkdown>
            </div>
          ) : (
            <pre
              className={`text-zinc-300 ${fontClasses[fontSize]} leading-relaxed font-mono whitespace-pre-wrap`}
            >
              {editingNode.data.label}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/50 text-zinc-500 text-xs flex justify-between items-center">
          <div className="flex items-center gap-4">
            {isUser && showKeyboardTip && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-medium animate-pulse">
                <kbd className="px-1.5 py-0.5 bg-primary/20 rounded text-[10px] font-bold">⌘Enter</kbd>
                <span>to go</span>
              </div>
            )}
            <div>
              Esc to close • {isUser ? '⌘Enter to send' : '⌘Enter to close'} • Changes auto-save
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isUser && (
              <button
                onClick={handleSend}
                disabled={!hasContent}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-[0.98]
                  ${
                    hasContent
                      ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }
                `}
              >
                <Send className="w-4 h-4" />
                <span>Send to AI</span>
              </button>
            )}
            {!isUser && (
              <button
                onClick={() => setEditingNodeId(null)}
                className="px-6 py-3 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 rounded-xl font-bold transition-all active:scale-[0.98]"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatOverlay;
