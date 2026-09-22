import React, { useState } from 'react';
import type { Application } from '../../types';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatDate, formatBytes, formatNumber } from '../../lib/formatters';
import {
  MoreVertical,
  CheckCircle2,
  FileEdit,
  Trash2,
  UploadCloud,
  Eye,
  ExternalLink,
  Smartphone,
} from 'lucide-react';

interface AppTableProps {
  apps: Application[];
  onEditApp: (app: Application) => void;
  onPublishApp: (id: string) => Promise<void>;
  onUnpublishApp: (id: string) => Promise<void>;
  onDeleteApp: (id: string) => Promise<void>;
  onReplaceApk: (app: Application) => void;
  onViewPublic: (app: Application) => void;
}

export const AppTable: React.FC<AppTableProps> = ({
  apps,
  onEditApp,
  onPublishApp,
  onUnpublishApp,
  onDeleteApp,
  onReplaceApk,
  onViewPublic,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteApp(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border overflow-hidden shadow-xs bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#28241e]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b font-mono text-xs uppercase tracking-wider bg-[#f5efe4] border-[#e2d8c3] text-[#716557] dark:bg-[#1f1c19] dark:border-[#28241e] dark:text-[#918678]">
                <th className="py-3.5 px-4 font-semibold">Application</th>
                <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Package Name</th>
                <th className="py-3.5 px-4 font-semibold">Version</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Size</th>
                <th className="py-3.5 px-4 font-semibold hidden lg:table-cell">Downloads</th>
                <th className="py-3.5 px-4 font-semibold hidden lg:table-cell">Updated</th>
                <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece2d1] dark:divide-[#24201b]">
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#7a6e60] dark:text-[#8a7f72]">
                    No applications found in this view.
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-[#faf5ec] dark:hover:bg-[#1f1d1a] transition-colors"
                  >
                    {/* App Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center bg-[#f0e7d8] border-[#dfd2be] dark:bg-[#221f1b] dark:border-[#332f28]">
                          {app.icon_url ? (
                            <img
                              src={app.icon_url}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate text-[#1c1713] dark:text-[#f8f5ee]">
                            {app.name}
                          </p>
                          <span className="text-xs text-[#7d7062] dark:text-[#8c8173] md:hidden truncate block">
                            {app.package_name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Package Name */}
                    <td className="py-3.5 px-4 font-mono text-xs text-[#716557] dark:text-[#8c8173] hidden md:table-cell truncate max-w-[200px]">
                      {app.package_name}
                    </td>

                    {/* Version */}
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold">
                      v{app.version_name}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {app.status === 'published' ? (
                        <Badge variant="emerald" size="sm">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="sm">
                          Draft
                        </Badge>
                      )}
                    </td>

                    {/* File Size */}
                    <td className="py-3.5 px-4 font-mono text-xs text-[#6e6254] dark:text-[#877c6e] hidden sm:table-cell">
                      {formatBytes(app.apk_file_size)}
                    </td>

                    {/* Downloads */}
                    <td className="py-3.5 px-4 font-mono text-xs text-[#6e6254] dark:text-[#877c6e] hidden lg:table-cell">
                      {formatNumber(app.downloads_count)}
                    </td>

                    {/* Updated */}
                    <td className="py-3.5 px-4 text-xs text-[#7a6e60] dark:text-[#83786a] hidden lg:table-cell">
                      {formatDate(app.updated_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewPublic(app)}
                          title="View public page"
                          className="p-1.5 rounded-lg border hover:bg-[#ede3d1] text-[#554a3e] border-[#dacbb3] dark:bg-[#201d19] dark:hover:bg-[#292520] dark:text-[#c4b8a7] dark:border-[#352f27]"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEditApp(app)}
                          title="Edit details"
                          className="p-1.5 rounded-lg border hover:bg-[#ede3d1] text-[#554a3e] border-[#dacbb3] dark:bg-[#201d19] dark:hover:bg-[#292520] dark:text-[#c4b8a7] dark:border-[#352f27]"
                        >
                          <FileEdit className="w-4 h-4" />
                        </button>

                        {app.status === 'published' ? (
                          <button
                            onClick={() => onUnpublishApp(app.id)}
                            title="Unpublish to Draft"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border hover:bg-amber-500/10 text-amber-700 border-amber-600/30 dark:text-amber-400 dark:border-amber-400/20"
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            onClick={() => onPublishApp(app.id)}
                            title="Publish App"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                          >
                            Publish
                          </button>
                        )}

                        <button
                          onClick={() => onReplaceApk(app)}
                          title="Replace APK file"
                          className="p-1.5 rounded-lg border hover:bg-[#ede3d1] text-[#554a3e] border-[#dacbb3] dark:bg-[#201d19] dark:hover:bg-[#292520] dark:text-[#c4b8a7] dark:border-[#352f27]"
                        >
                          <UploadCloud className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(app)}
                          title="Delete App"
                          className="p-1.5 rounded-lg border text-rose-600 hover:bg-rose-500/10 border-rose-500/30 dark:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Deletion */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Application"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove the database record and all associated APK object storage files. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};
