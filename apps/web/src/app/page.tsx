'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { NeonButton } from '@/components/ui/neon-button';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { FadeIn } from '@/components/ui/motion-wrapper';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-n-bg relative overflow-hidden">
      {/* Animated gradient blobs */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 10, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-n-cyan/[0.05] rounded-full blur-[150px]"
      />
      <motion.div
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 20, -10, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-n-purple/[0.07] rounded-full blur-[120px]"
      />

      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="text-center space-y-8 px-4 relative z-10">
        <FadeIn>
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-display text-6xl bg-gradient-to-r from-n-cyan to-n-purple bg-clip-text text-transparent">
              ADA
            </h1>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="text-heading-2 text-n-text-secondary max-w-xl">
            Autonomous Dev Agent Teams for Any Repo
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <p className="text-body text-n-text-muted max-w-md mx-auto">
            Ship software with autonomous AI teams. 10 specialized roles work 24/7
            on your codebase — CEO to QA, Research to Engineering.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/login">
              <NeonButton variant="primary" size="lg">
                Get Started
              </NeonButton>
            </Link>
            <Link href="/dashboard">
              <NeonButton variant="outline" size="lg">
                View Dashboard
              </NeonButton>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex flex-wrap gap-8 justify-center pt-8">
            <div className="glass rounded-xl px-5 py-3">
              <span className="text-2xl font-bold text-n-cyan block">
                <AnimatedNumber value={1119} className="text-n-cyan" />+
              </span>
              <p className="text-xs text-n-text-muted mt-0.5">Cycles Run</p>
            </div>
            <div className="glass rounded-xl px-5 py-3">
              <span className="text-2xl font-bold text-n-status-success block">
                <AnimatedNumber value={699} className="text-n-status-success" />
              </span>
              <p className="text-xs text-n-text-muted mt-0.5">Consecutive</p>
            </div>
            <div className="glass rounded-xl px-5 py-3">
              <span className="text-2xl font-bold text-n-purple block">
                <AnimatedNumber value={10} className="text-n-purple" />
              </span>
              <p className="text-xs text-n-text-muted mt-0.5">AI Roles</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </main>
  );
}
