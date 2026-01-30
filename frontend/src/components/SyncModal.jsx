import { useEffect } from 'react';
import useChatStore from '../store/chatStore';
import TimeSync from './TimeSync';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * SyncModal Component
 *
 * A modal that displays the TimeSync form when users need to sync their game time.
 * Uses Shadcn Dialog for consistent styling and accessibility.
 */
function SyncModal({ isOpen, onClose, onSync, title, subtitle }) {
  const { isSynced } = useChatStore();

  // Auto-close when user successfully syncs
  useEffect(() => {
    if (isOpen && isSynced) {
      onClose();
    }
  }, [isSynced, isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">
          <TimeSync onSync={onSync} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SyncModal;
