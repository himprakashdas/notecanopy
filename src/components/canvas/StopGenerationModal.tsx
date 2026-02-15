import React from 'react';

interface StopGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StopGenerationModal: React.FC<StopGenerationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg bg-zinc-900 p-6 shadow-2xl border border-zinc-800 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-white">Stop Generation</h2>
        <p className="mt-2 text-zinc-400">
          Are you sure you want to stop? The incomplete node will be removed.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-600 py-3.5 px-6 text-white hover:bg-red-500 transition-all font-bold shadow-lg shadow-red-900/20 active:scale-[0.98]"
          >
            Stop Generation
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-800/50 py-3 px-6 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
