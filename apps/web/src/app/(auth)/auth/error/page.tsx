import Link from 'next/link';

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ada-primary-light to-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8">
        <div className="bg-bg-primary rounded-xl shadow-lg p-8 space-y-6 text-center">
          <span className="text-4xl block">⚠️</span>
          <h1 className="text-heading-1">Authentication Error</h1>
          <p className="text-body text-text-muted">
            {error === 'Configuration'
              ? 'There is a problem with the server configuration.'
              : error === 'AccessDenied'
                ? 'Access denied. You do not have permission to sign in.'
                : 'An error occurred during authentication. Please try again.'}
          </p>
          {error && (
            <p className="text-xs text-text-muted font-mono">
              Error code: {error}
            </p>
          )}
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-ada-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
