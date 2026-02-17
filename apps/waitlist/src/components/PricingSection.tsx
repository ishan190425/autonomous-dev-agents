import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "Free",
    description: "Get started with local execution",
    features: ["CLI tool", "All templates", "Local execution", "Community support"],
    cta: "Join Waitlist",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For individuals shipping fast",
    features: ["Everything in Free", "Web dashboard", "Cycle analytics", "Notifications", "Priority issues"],
    cta: "Join Waitlist",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/mo",
    description: "For teams that need control",
    features: ["Everything in Pro", "Custom roles", "SSO & team mgmt", "Priority support", "SLA guarantee"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const PricingSection = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-mono text-primary mb-3 uppercase tracking-widest">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Simple, <span className="text-gradient-primary">transparent</span> pricing
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.highlighted
                  ? "border-primary/40 bg-card glow-primary"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Popular
                </div>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-3 mb-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={scrollToTop}
                className={`w-full h-10 rounded-lg font-medium text-sm transition-all ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:brightness-110"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
