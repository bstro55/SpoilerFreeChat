/**
 * PreferencesModal Component
 *
 * Allows authenticated users to edit their preferences:
 * - Preferred nickname
 * - Theme (light/dark/system)
 * - Notification sounds
 */

import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

function PreferencesModal({ isOpen, onClose }) {
  const { profile, updatePreferences } = useAuthStore();
  const [saving, setSaving] = useState(false);

  // Form state
  const [preferredNickname, setPreferredNickname] = useState('');
  const [theme, setTheme] = useState('system');
  const [notificationSound, setNotificationSound] = useState(true);

  // Initialize form from profile when modal opens
  useEffect(() => {
    if (isOpen && profile) {
      setPreferredNickname(profile.preferredNickname || '');
      setTheme(profile.theme || 'system');
      setNotificationSound(profile.notificationSound ?? true);
    }
  }, [isOpen, profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        preferredNickname: preferredNickname.trim() || null,
        theme,
        notificationSound,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>
            Customize your SpoilerFreeChat experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preferred Nickname */}
          <div className="space-y-2">
            <Label htmlFor="preferredNickname">Default Nickname</Label>
            <Input
              id="preferredNickname"
              value={preferredNickname}
              onChange={(e) => setPreferredNickname(e.target.value)}
              placeholder="Auto-fill when joining rooms"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              This nickname will be pre-filled when you join a room
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notification Sounds */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notificationSound">Notification Sounds</Label>
              <p className="text-xs text-muted-foreground">
                Play a sound when new messages arrive
              </p>
            </div>
            <Switch
              id="notificationSound"
              checked={notificationSound}
              onCheckedChange={setNotificationSound}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PreferencesModal;
