import { motion } from "framer-motion";

const roles = [
  { emoji: "👔", title: "CEO", action: "Sets strategy, analyzes market, defines direction", model: "Opus" },
  { emoji: "🔬", title: "Research", action: "Scouts technologies, evaluates feasibility", model: "Sonnet" },
  { emoji: "📦", title: "Product", action: "Writes specs, creates feature issues, prioritizes", model: "Sonnet" },
  { emoji: "📋", title: "Scrum", action: "Plans sprints, tracks progress, unblocks", model: "Haiku" },
  { emoji: "⚙️", title: "Engineering", action: "Writes code, creates PRs, reviews", model: "Sonnet" },
  { emoji: "🛡️", title: "Ops", action: "Merges PRs, fixes CI, enforces standards", model: "Haiku" },
  { emoji: "🎨", title: "Design", action: "Reviews APIs, proposes architecture", model: "Sonnet" },
];

const HowItWorksSection = () => {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      <div className="container relative px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-mono text-primary mb-3 uppercase tracking-widest">How It Works</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            One cycle. <span className="text-gradient-primary">Every role.</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Each heartbeat, ADA becomes one role. After acting, it rotates to the next. Over a full rotation, every aspect of your project gets attention.
          </p>
        </motion.div>

        {/* Terminal-style rotation display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-accent/60" />
              <div className="w-3 h-3 rounded-full bg-primary/60" />
              <span className="ml-2 text-xs font-mono text-muted-foreground">ada status</span>
            </div>
            {/* Role list */}
            <div className="divide-y divide-border">
              {roles.map((role, i) => (
                <motion.div
                  key={role.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-4 px-5 py-3.5 font-mono text-sm hover:bg-muted/20 transition-colors"
                >
                  <span className="text-muted-foreground w-4">{i}</span>
                  <span className="text-xl w-8">{role.emoji}</span>
                  <span className="text-foreground font-semibold w-28">{role.title}</span>
                  <span className="text-muted-foreground flex-1 hidden sm:block">{role.action}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    role.model === "Opus" ? "bg-accent/20 text-accent" :
                    role.model === "Haiku" ? "bg-primary/10 text-primary" :
                    "bg-secondary text-secondary-foreground"
                  }`}>
                    {role.model}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
