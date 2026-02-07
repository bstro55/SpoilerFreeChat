import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Terms of Service Page
 *
 * Simple, clear terms for SpoilerFreeChat.
 * Required for Google OAuth verification.
 */
function TermsOfService({ onBack }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="font-bold text-lg">Terms of Service</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: February 6, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By using SpoilerFreeChat, you agree to these terms. If you don't agree, please don't
              use the service. These terms apply to all users, whether signed in or using as a guest.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What the Service Does</h2>
            <p className="text-muted-foreground">
              SpoilerFreeChat provides a chat platform for live sports events where messages are
              delayed based on each user's reported game time. This helps prevent spoilers for
              users watching on delayed broadcasts. The service supports multiple sports including
              basketball, football, hockey, and soccer.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">User Conduct</h2>
            <p className="text-muted-foreground mb-4">When using SpoilerFreeChat, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Be respectful to other users</li>
              <li>Not post hate speech, harassment, or abusive content</li>
              <li>Not spam or flood chat rooms with repetitive messages</li>
              <li>Not impersonate other users or public figures</li>
              <li>Not use the service for any illegal activities</li>
              <li>Not attempt to disrupt or attack the service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Account Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to remove users who violate these terms or engage in abusive
              behavior. If you're removed from a room or the service, you may lose access to
              your chat history and preferences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">No Guarantee of Spoiler-Free Experience</h2>
            <p className="text-muted-foreground">
              While we do our best to prevent spoilers through our delay system, we cannot
              guarantee a completely spoiler-free experience. The delay system depends on users
              accurately reporting their game time. Users who report incorrect times may
              accidentally spoil events for others, or receive spoilers themselves.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Service Availability</h2>
            <p className="text-muted-foreground">
              We aim to keep SpoilerFreeChat available, but we don't guarantee 100% uptime.
              The service may be temporarily unavailable due to maintenance, updates, or
              technical issues. We're not responsible for any missed conversations due to
              service interruptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Content Ownership</h2>
            <p className="text-muted-foreground">
              You retain ownership of the messages you send. However, by posting messages,
              you grant us the right to store and transmit them to other users in the room.
              Messages are automatically deleted after 7 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              SpoilerFreeChat is provided "as is" without warranties. We're not liable for
              any spoilers you receive, messages you miss, or any other issues that arise
              from using the service. Use at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms from time to time. Continued use of the service after
              changes are posted constitutes acceptance of the new terms. We will update the
              "Last updated" date at the top when changes are made.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about these terms, you can open an issue on our{' '}
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

export default TermsOfService;
