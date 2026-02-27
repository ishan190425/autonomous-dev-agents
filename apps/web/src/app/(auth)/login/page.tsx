import Link from 'next/link';

import { loginWithGithub } from '@/lib/auth/actions';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-n-bg relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-n-cyan/[0.04] rounded-full blur-[120px]" />
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-n-purple/[0.06] rounded-full blur-[100px]" />

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="glass border border-white/[0.12] rounded-2xl p-8 space-y-6 shadow-glow-cyan">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" data-testid="ada-logo" className="inline-block hover:opacity-80 transition-opacity">
              <span className="text-3xl font-bold bg-gradient-to-r from-n-cyan to-n-purple bg-clip-text text-transparent block">
                ADA
              </span>
            </Link>
            <h1 className="text-lg text-n-text-secondary mt-3">Sign in to continue</h1>
            <p className="text-body text-n-text-muted mt-1">
              Manage your autonomous dev teams
            </p>
          </div>

          {/* GitHub OAuth Button */}
          <form action={loginWithGithub}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 glass border border-white/[0.12] text-n-text rounded-lg font-medium hover:bg-white/[0.08] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Continue with GitHub
            </button>
          </form>

          {/* Back Link */}
          <div className="text-center">
            <Link href="/" className="text-sm text-n-cyan hover:text-n-cyan/80 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
