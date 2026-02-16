import React from 'react';
import { X, FileJson, FileText, Package } from 'lucide-react';

interface ExportAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'json' | 'markdown' | 'both') => void;
  projectCount: number;
}

export const ExportAllModal: React.FC<ExportAllModalProps> = ({
  isOpen,
  onClose,
  onExport,
  projectCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Export All Projects</h2>
            <p className="text-sm text-gray-400 mt-1">
              Choose a format to export {projectCount} {projectCount === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onExport('json')}
            className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-primary/50 rounded-xl transition-all group"
          >
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <FileJson className="text-blue-400" size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-white">JSON Only</div>
              <div className="text-sm text-gray-400">Machine-readable format for re-import</div>
            </div>
          </button>

          <button
            onClick={() => onExport('markdown')}
            className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-primary/50 rounded-xl transition-all group"
          >
            <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
              <FileText className="text-green-400" size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-white">Markdown Only</div>
              <div className="text-sm text-gray-400">Human-readable documentation format</div>
            </div>
          </button>

          <button
            onClick={() => onExport('both')}
            className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-primary/50 rounded-xl transition-all group"
          >
            <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
              <Package className="text-purple-400" size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-white">Both Formats</div>
              <div className="text-sm text-gray-400">Complete export with JSON + Markdown</div>
            </div>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Files will be organized in a ZIP archive
          </p>
        </div>
      </div>
    </div>
  );
};
