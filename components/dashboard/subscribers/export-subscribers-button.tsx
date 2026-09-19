'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconDownload, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import { exportSubscribersCsvAction } from '@/actions/subscribe';

interface ExportSubscribersButtonProps {
  totalCount?: number;
  disabled?: boolean;
}

export function ExportSubscribersButton({
  totalCount = 0,
  disabled = false,
}: ExportSubscribersButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (totalCount === 0) {
      toast.info('No subscribers available to export.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await exportSubscribersCsvAction();

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to export subscribers.');
        return;
      }

      const { csvContent, filename, totalCount: exportedCount } = res.data;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportedCount} subscribers to ${filename}`);
    } catch {
      toast.error('An unexpected error occurred while exporting subscribers.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="h-9 gap-1.5 cursor-pointer text-xs font-medium"
      title={totalCount === 0 ? 'No subscribers to export' : 'Download subscribers list as CSV'}
    >
      {isExporting ? (
        <>
          <IconLoader2 size={16} className="animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <IconDownload size={16} />
          <span>Export CSV</span>
        </>
      )}
    </Button>
  );
}
