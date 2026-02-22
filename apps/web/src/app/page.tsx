import Link from 'next/link';

/**
 * ADA Dashboard Landing — Marketing + Auth Entry
 * Sprint 3: This will redirect to /dashboard if authenticated
 */
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-ada-primary-light to-white dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-8 px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl">🤖</span>
          <h1 className="text-display bg-gradient-to-r from-ada-primary to-violet-500 bg-clip-text text-transparent">
            ADA
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-heading-2 text-text-secondary max-w-xl">
          Autonomous Dev Agent Teams for Any Repo
        </p>

        <p className="text-body text-text-muted max-w-md mx-auto">
          Ship software with autonomous AI teams. 10 specialized roles work 24/7
          on your codebase — CEO to QA, Research to Engineering.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-ada-primary text-white rounded-lg font-medium hover:bg-ada-primary-hover transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            View Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-8 justify-center pt-8 text-sm text-text-muted">
          <div>
            <span className="text-2xl font-bold text-ada-primary">1119+</span>
            <p>Cycles Run</p>
          </div>
          <div>
            <span className="text-2xl font-bold text-ada-success">699</span>
            <p>Consecutive</p>
          </div>
          <div>
            <span className="text-2xl font-bold text-role-research">10</span>
            <p>AI Roles</p>
          </div>
        </div>
      </div>
    </main>
  );
}
