import React from 'react';

interface DeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteOnly: () => void;
  onDeleteAll: () => void;
}

export const DeletionModal: React.FC<DeletionModalProps> = ({
  isOpen,
  onClose,
  onDeleteOnly,
  onDeleteAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg bg-zinc-900 p-6 shadow-2xl border border-zinc-800 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-white">Delete Node</h2>
        <p className="mt-2 text-zinc-400">How would you like to delete this node?</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onDeleteAll}
            className="w-full rounded-xl bg-red-600/90 py-3.5 px-6 text-white hover:bg-red-600 transition-colors font-bold shadow-lg shadow-red-900/20 active:scale-[0.98]"
          >
            Node and all descendants
          </button>
          <button
            onClick={onDeleteOnly}
            className="w-full rounded-xl border border-red-500/20 bg-red-500/10 py-3.5 px-6 text-red-400 hover:bg-red-500/20 transition-all font-bold active:scale-[0.98]"
          >
            Only this node
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-transparent py-3 px-6 text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
