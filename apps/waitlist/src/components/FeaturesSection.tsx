import { motion } from "framer-motion";
import { Bot, Brain, GitBranch, Repeat, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Multi-Role Agent Teams",
    description: "Not just a code bot. A CEO, researcher, PM, engineer, ops lead, and designer working in rotation.",
  },
  {
    icon: Repeat,
    title: "Autonomous Dispatch Loop",
    description: "Heartbeat-driven cycles where each role reads context, acts, and updates shared memory.",
  },
  {
    icon: Brain,
    title: "Persistent Memory",
    description: "A shared memory bank gives agents continuity across sessions, with automatic compression.",
  },
  {
    icon: Zap,
    title: "Cost Optimized",
    description: "Auto-selects the right LLM model per role — saving ~14% vs single model usage.",
  },
  {
    icon: GitBranch,
    title: "Git-Native",
    description: "Every action is a commit. Full traceability. Works with your existing GitHub workflow.",
  },
  {
    icon: Shield,
    title: "Open Source Core",
    description: "AGPLv3 licensed. Inspect, modify, and self-host the core framework with confidence.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-mono text-primary mb-3 uppercase tracking-widest">Features</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Everything you need to go <span className="text-gradient-primary">autonomous</span>
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group relative p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:glow-primary transition-shadow">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
