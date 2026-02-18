import { memo, useRef, useState } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Trash2, Info, EyeOff, StickyNote, Plus } from 'lucide-react';
import { NoteCanopyNode, Tag } from '../../types';
import { useFlowStore } from '../../store/useFlowStore';
import { useAppStore } from '../../store/useAppStore';
import { Tooltip } from '../ui/Tooltip';
import { TagModal } from '../ui/TagModal';

const NoteNode = ({ id, data, selected }: NodeProps<NoteCanopyNode>) => {
  const setDeletingNodeId = useFlowStore((state) => state.setDeletingNodeId);
  const updateNodeContent = useFlowStore((state) => state.updateNodeContent);
  const toggleNoteVisibility = useFlowStore((state) => state.toggleNoteVisibility);
  const addTag = useFlowStore((state) => state.addTag);
  const removeTag = useFlowStore((state) => state.removeTag);
  const fontSize = useAppStore((state) => state.fontSize);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showTagModal, setShowTagModal] = useState(false);

  const isHidden = data.isHidden;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingNodeId(id);
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNoteVisibility(id);
  };

  const handleAddTag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTagModal(true);
  };

  const onTagConfirm = (tag: Tag) => {
    addTag(id, tag);
  };

  if (isHidden) {
    return (
      <div className="relative group">
        <Tooltip content="Show Note" position="right">
          <button
            onClick={handleToggleVisibility}
            className="w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary border border-secondary/50 flex items-center justify-center text-secondary-foreground shadow-md transition-all hover:scale-110"
          >
            <Info className="w-5 h-5 text-white" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <>
      <NodeResizer
        color="var(--color-brand-secondary)"
        isVisible={selected}
        minWidth={200}
        minHeight={150}
      />

      <div
        className={twMerge(
          clsx(
            'flex flex-col h-full w-full rounded-lg shadow-xl transition-all',
            'bg-[var(--color-note-bg)] border-2',
            selected
              ? 'border-secondary shadow-secondary/20'
              : 'border-[var(--color-note-border)]/30'
          )
        )}
        onDoubleClick={() => {
          textareaRef.current?.focus();
        }}
      >
        {/* Header / Drag Handle */}
        <div className="custom-drag-handle px-3 py-2 border-b border-[var(--color-note-border)]/20 flex items-center justify-between bg-[var(--color-note-border)]/10 rounded-t-lg cursor-grab active:cursor-grabbing">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[var(--color-note-text)] font-bold uppercase tracking-wider text-[10px]">
              <StickyNote className="w-3 h-3" />
              Notes
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
              <button
                onClick={handleAddTag}
                className="w-4 h-4 rounded-full border border-[var(--color-note-text)]/30 flex items-center justify-center text-[var(--color-note-text)]/50 hover:text-[var(--color-note-text)] hover:bg-[var(--color-note-border)]/20 transition-all"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleVisibility}
              className="p-1 text-[var(--color-note-text)]/50 hover:text-[var(--color-note-text)] hover:bg-[var(--color-note-border)]/20 rounded transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-[var(--color-note-text)]/50 hover:text-red-600 hover:bg-red-100/50 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow p-2 overflow-hidden">
          <textarea
            ref={textareaRef}
            className={twMerge(
              'w-full h-full resize-none bg-transparent outline-none text-[var(--color-note-text)] placeholder-[var(--color-note-text)]/30 custom-scrollbar p-1 nodrag nopan Nowheel',
              fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'
            )}
            placeholder="Type your note here..."
            value={data.label}
            onChange={(e) => updateNodeContent(id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </div>

      <TagModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onConfirm={onTagConfirm}
      />
    </>
  );
};

export default memo(NoteNode);
