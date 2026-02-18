import React, { useState } from 'react';
import { Tag as TagIcon, X } from 'lucide-react';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tag: { label: string; color: string }) => void;
}

const PRESET_COLORS = [
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#eab308', // Amber
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#71717a', // Zinc
  '#ffffff', // White
];

export const TagModal: React.FC<TagModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [label, setLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [customColor, setCustomColor] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!label.trim()) return;
    onConfirm({
      label: label.trim(),
      color: customColor || selectedColor,
    });
    setLabel('');
    setCustomColor('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <TagIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Add Tag</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Tag Label
              </label>
              <span className="text-[10px] text-zinc-500 font-medium">
                {label.length}/10
              </span>
            </div>
            <input
              autoFocus
              type="text"
              value={label}
              maxLength={10}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              placeholder="e.g. Research"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Select Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    setCustomColor('');
                  }}
                  className={`w-full aspect-square rounded-lg transition-all transform active:scale-90 h-10 ${
                    selectedColor === color && !customColor
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 border-none'
                      : 'border border-white/10 hover:border-white/30'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Custom Hex Color
            </label>
            <div className="flex gap-2">
              <div
                className="w-12 h-12 rounded-xl border border-zinc-800 shrink-0 shadow-inner overflow-hidden"
              >
                <input
                  type="color"
                  value={customColor || selectedColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setSelectedColor(e.target.value);
                  }}
                  className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                />
              </div>
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setSelectedColor(e.target.value);
                }}
                placeholder="#hexcode"
                className="flex-grow bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 font-mono focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleConfirm}
              disabled={!label.trim()}
              className={`w-full rounded-xl py-3.5 px-6 text-white transition-all font-bold text-sm shadow-xl active:scale-[0.98] ${
                label.trim()
                  ? 'bg-primary hover:bg-primary/90 shadow-primary/20'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              Add Tag
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3.5 px-6 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-sm font-medium active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
