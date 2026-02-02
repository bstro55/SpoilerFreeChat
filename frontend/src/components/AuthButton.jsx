/**
 * AuthButton Component
 *
 * Shows sign in button for guests, or user menu for authenticated users.
 * Opens AuthModal when sign in is clicked, PreferencesModal for settings.
 */

import { useState } from 'react';
import useAuthStore from '../store/authStore';
import AuthModal from './AuthModal';
import PreferencesModal from './PreferencesModal';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Settings, User } from 'lucide-react';

function AuthButton() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const { session, signOut, isLoading, isAuthAvailable } = useAuthStore();

  // Don't show anything while loading initial auth state
  if (isLoading) {
    return null;
  }

  // Don't show sign-in button if Supabase isn't configured
  if (!isAuthAvailable()) {
    return null;
  }

  // User is signed in
  if (session) {
    const email = session.user?.email;
    const displayName = email ? email.split('@')[0] : 'User';

    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPrefsModal(true)}
          className="gap-1.5"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{displayName}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowPrefsModal(true)}
          title="Preferences"
          className="h-8 w-8"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          title="Sign Out"
          className="gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
        <PreferencesModal
          isOpen={showPrefsModal}
          onClose={() => setShowPrefsModal(false)}
        />
      </div>
    );
  }

  // User is a guest
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAuthModal(true)}
        className="gap-1.5"
      >
        <LogIn className="h-4 w-4" />
        <span>Sign In</span>
      </Button>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}

export default AuthButton;
