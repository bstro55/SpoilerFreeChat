/**
 * AuthModal Component
 *
 * A modal that displays Supabase Auth UI for signing in.
 * Supports Google OAuth and Magic Link (email) authentication.
 */

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function AuthModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to SpoilerFreeChat</DialogTitle>
          <DialogDescription>
            Sign in to save your preferences and access your recent rooms across
            devices.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary))',
                  },
                },
              },
            }}
            providers={['google']}
            magicLink={true}
            showLinks={true}
            view="sign_in"
            // Redirect back to the app after auth
            redirectTo={window.location.origin}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
