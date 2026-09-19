'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { IconTrash } from '@tabler/icons-react';
import { PruneLogsModal } from './prune-logs-modal';

export function PruneLogsButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-9 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer font-medium"
      >
        <IconTrash size={15} />
        <span>Prune Old Logs</span>
      </Button>

      <PruneLogsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
