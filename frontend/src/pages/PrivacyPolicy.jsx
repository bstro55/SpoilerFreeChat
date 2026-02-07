import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Privacy Policy Page
 *
 * Simple, honest privacy policy for SpoilerFreeChat.
 * Required for Google OAuth verification.
 */
function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="font-bold text-lg">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: February 6, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What SpoilerFreeChat Is</h2>
            <p className="text-muted-foreground mb-4">
              SpoilerFreeChat is a web application that enables spoiler-free live sports conversations.
              We synchronize chat messages based on each user's current game time position, ensuring
              no one receives spoilers from viewers who are ahead in the broadcast.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What Data We Collect</h2>
            <p className="text-muted-foreground mb-4">We collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Google Account Info (if you sign in):</strong> Your email address and name
                from Google OAuth. This is used to identify your account and save your preferences.
              </li>
              <li>
                <strong>Nickname:</strong> The display name you choose when joining chat rooms.
              </li>
              <li>
                <strong>Chat Messages:</strong> The messages you send in rooms. These are stored
                temporarily to enable the delay feature and are automatically deleted after 7 days.
              </li>
              <li>
                <strong>Game Time Data:</strong> Your reported game clock position, used to calculate
                message delays.
              </li>
              <li>
                <strong>Preferences:</strong> Your chosen theme (light/dark) and notification settings.
              </li>
              <li>
                <strong>Recent Rooms:</strong> A list of rooms you've joined, so you can quickly rejoin.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide the spoiler-free chat service</li>
              <li>To calculate and apply appropriate message delays</li>
              <li>To remember your preferences across sessions</li>
              <li>To let you quickly rejoin recent rooms</li>
              <li>To reconnect you to your room if you refresh the page</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Data Storage and Security</h2>
            <p className="text-muted-foreground mb-4">
              Your data is stored in a PostgreSQL database hosted by Supabase (a reputable database
              service). We use secure connections (HTTPS) for all data transmission.
            </p>
            <p className="text-muted-foreground">
              Chat messages are automatically deleted after 7 days. Session data is cleaned up
              when you disconnect or after periods of inactivity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">We use the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Google OAuth:</strong> For optional sign-in authentication</li>
              <li><strong>Supabase:</strong> Database hosting and authentication</li>
              <li><strong>Vercel:</strong> Frontend hosting</li>
              <li><strong>Koyeb:</strong> Backend server hosting</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Each of these services has their own privacy policies. We do not sell or share your
              data with any other third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You can use the app as a guest without signing in</li>
              <li>You can leave any room at any time</li>
              <li>You can sign out to disconnect your Google account</li>
              <li>Messages you send are automatically deleted after 7 days</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Cookies</h2>
            <p className="text-muted-foreground">
              We use browser localStorage to remember your session and preferences. We do not use
              tracking cookies or third-party analytics cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. We will update the "Last updated"
              date at the top of this page when we make changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about this privacy policy, you can open an issue on our{' '}
              <a
                href="https://github.com/brandonstroder/SpoilerFreeChat"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub repository
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default PrivacyPolicy;
