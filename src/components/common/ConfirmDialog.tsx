import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl p-6 shadow-xl border bg-[#fbf8f2] border-[#e2d8c3] text-[#221c17] dark:bg-[#181614] dark:border-[#2d2822] dark:text-[#f8f5ee]">
        <button
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#786b5e] hover:bg-[#eee4d2] dark:text-[#908475] dark:hover:bg-[#25211c]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              isDestructive
                ? 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                : 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm text-[#665a4e] dark:text-[#9c9082] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#e8dfcd] dark:border-[#28241e]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors bg-[#f2ebd9] border-[#d8cdb5] text-[#4d4133] hover:bg-[#e9dfc9] dark:bg-[#201d19] dark:border-[#352f27] dark:text-[#cec2b1] dark:hover:bg-[#28241f]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity ${
              isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
            } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
