import { Github, MessageCircle } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-foreground font-mono">ADA</span>
            <span className="text-sm text-muted-foreground">Autonomous Dev Agents</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/ishan190425/autonomous-dev-agents"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="https://discord.gg/5NCHGJAz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Discord
            </a>
          </div>
        </div>
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Built by <a href="https://github.com/ishan190425" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Rathi Industries</a> — engineering the future with autonomous AI teams.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
