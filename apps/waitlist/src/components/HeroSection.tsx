import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waitlistCount, setWaitlistCount] = useState(0);

  useEffect(() => {
    supabase.rpc("get_waitlist_count").then(({ data }) => {
      if (data !== null) setWaitlistCount(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase() });

    setLoading(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You're already on the list!");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    setSubmitted(true);
    setWaitlistCount((c) => c + 1);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-radial" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-accent/5 blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      <div className="container relative z-10 px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-mono text-primary">Now in Early Access</span>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-6">
            <span className="text-foreground">Ship software</span>
            <br />
            <span className="text-gradient-primary">autonomously.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            ADA sets up a full AI dev team — CEO, researcher, PM, engineer, ops, designer — that autonomously manages your project in continuous dispatch cycles.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-md mx-auto mb-10"
          >
            <div className="font-mono text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 border border-border">
              <span className="text-primary">$</span> ada init && ada run <span className="terminal-cursor" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-md mx-auto"
          >
            {!submitted ? (
              <>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="flex-1 h-12 px-4 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:brightness-110 transition-all glow-primary disabled:opacity-70"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Join Waitlist
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
                {error && (
                  <p className="text-sm text-destructive mt-2">{error}</p>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-3 h-12 px-6 rounded-lg border border-primary/30 bg-primary/10"
              >
                <Check className="w-5 h-5 text-primary" />
                <span className="text-primary font-medium">You're on the list! We'll be in touch.</span>
              </motion.div>
            )}

            <p className="text-xs text-muted-foreground mt-3">
              {waitlistCount > 0
                ? `Join ${waitlistCount}+ developers already on the waitlist`
                : "Be among the first to experience autonomous dev teams"}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
