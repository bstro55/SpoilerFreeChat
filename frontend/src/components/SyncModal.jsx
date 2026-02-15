import { useEffect, useState } from 'react';
import useChatStore from '../store/chatStore';
import TimeSync from './TimeSync';
import { Button } from '@/components/ui/button';
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
 * Includes educational content explaining why sync matters for spoiler protection.
 * Uses Shadcn Dialog for consistent styling and accessibility.
 */
function SyncModal({ isOpen, onClose, onSync, title, subtitle }) {
  const { isSynced } = useChatStore();
  // Show education on first sync only (not for resyncs)
  const [hasSeenEducation, setHasSeenEducation] = useState(false);

  // Auto-close when user successfully syncs
  useEffect(() => {
    if (isOpen && isSynced) {
      onClose();
    }
  }, [isSynced, isOpen, onClose]);

  // Determine if we should show education (first time user who hasn't synced)
  const showEducation = !isSynced && !hasSeenEducation;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        {/* Educational content for first-time sync */}
        {showEducation && !isSynced ? (
          <div className="py-2 space-y-4">
            <div className="space-y-3 text-sm">
              <p className="font-medium">How Spoiler-Free Chat Works</p>
              <p className="text-muted-foreground">
                Different viewers have different broadcast delays. Cable TV might be nearly live,
                while streaming can be 30+ seconds behind.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                  To protect you from spoilers:
                </p>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Enter your current game clock time</li>
                  <li>We calculate your broadcast delay</li>
                  <li>Messages are held until you catch up</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Tip: For best results, coordinate with your friends to sync at the same real-world moment.
              </p>
            </div>
            <Button onClick={() => setHasSeenEducation(true)} className="w-full">
              Got it, let me sync
            </Button>
          </div>
        ) : (
          <div className="py-2">
            <TimeSync onSync={onSync} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SyncModal;
