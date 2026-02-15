import React from 'react';
import { Download, FileText, FileJson } from 'lucide-react';

interface ProjectExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportGeneric: (format: 'markdown' | 'json') => void;
  projectName: string;
}

export const ProjectExportModal: React.FC<ProjectExportModalProps> = ({
  isOpen,
  onClose,
  onExportGeneric,
  projectName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <Download className="w-6 h-6 text-indigo-500" />
          </div>

          <h2 className="text-xl font-bold text-white">Export Project</h2>
          <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
            Choose a format to export{' '}
            <span className="text-zinc-200 font-semibold">"{projectName}"</span>.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => onExportGeneric('markdown')}
            className="group w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 px-4 text-zinc-100 transition-all font-medium border border-zinc-700 hover:border-zinc-600"
          >
            <FileText className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
            <span>Export as Markdown</span>
          </button>

          <button
            onClick={() => onExportGeneric('json')}
            className="group w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 px-4 text-zinc-100 transition-all font-medium border border-zinc-700 hover:border-zinc-600"
          >
            <FileJson className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors" />
            <span>Export as JSON</span>
          </button>

          <button
            onClick={onClose}
            className="mt-2 w-full text-zinc-500 hover:text-zinc-300 text-sm font-medium py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
