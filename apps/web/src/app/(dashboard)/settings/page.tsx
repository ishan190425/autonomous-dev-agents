/**
 * Settings Page — Team configuration, billing, API keys
 * Sprint 3: Auth, billing integration, API key management
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Settings</h1>
        <p className="text-body text-text-secondary">
          Configure your team, billing, and API access
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team Settings */}
        <div className="bg-bg-primary rounded-lg border p-6">
          <h2 className="text-heading-3 mb-4">Team Configuration</h2>
          <p className="text-body text-text-muted">
            Sprint 3: Edit roster, rotation order, and role settings
          </p>
        </div>

        {/* API Keys */}
        <div className="bg-bg-primary rounded-lg border p-6">
          <h2 className="text-heading-3 mb-4">API Keys</h2>
          <p className="text-body text-text-muted">
            Sprint 3 Day 2: Generate and manage API keys
          </p>
        </div>

        {/* Billing */}
        <div className="bg-bg-primary rounded-lg border p-6">
          <h2 className="text-heading-3 mb-4">Billing</h2>
          <p className="text-body text-text-muted">
            Sprint 3 Days 5-7: Stripe subscription management
          </p>
        </div>

        {/* Integrations */}
        <div className="bg-bg-primary rounded-lg border p-6">
          <h2 className="text-heading-3 mb-4">Integrations</h2>
          <p className="text-body text-text-muted">
            Sprint 3: GitHub, Slack, Discord notifications
          </p>
        </div>
      </div>
    </div>
  );
}
