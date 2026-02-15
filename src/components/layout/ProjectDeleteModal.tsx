import React from 'react';

interface ProjectDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
}

export const ProjectDeleteModal: React.FC<ProjectDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  projectName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-white">Delete Project?</h2>
          <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="text-zinc-200 font-semibold">"{projectName}"</span>? This action is
            permanent and all nodes in this project will be lost.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-600 py-3.5 px-6 text-white hover:bg-red-500 active:scale-[0.98] transition-all font-bold shadow-lg shadow-red-900/20"
          >
            Confirm Delete
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3.5 px-6 text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-[0.98] transition-all text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
