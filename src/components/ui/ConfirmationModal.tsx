import React from 'react';
import { TriangleAlert } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2 rounded-full ${confirmVariant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}
          >
            <TriangleAlert className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        </div>

        <p className="text-zinc-400 leading-relaxed text-sm">{message}</p>

        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full rounded-xl py-3.5 px-6 text-white transition-all font-bold text-sm shadow-lg active:scale-[0.98] ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                : 'bg-zinc-100 text-zinc-900 hover:bg-white'
            }`}
          >
            {confirmLabel}
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
  );
};
