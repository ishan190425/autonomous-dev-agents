/**
 * `ada status` — Show the current rotation state, last actions, and memory bank summary.
 */

import { Command } from "commander";
import * as path from "node:path";
import {
  readRotationState,
  readRoster,
  getRotationSummary,
  readMemoryBank,
  countLines,
  extractVersion,
  extractCycle,
} from "@ada/core";

export const statusCommand = new Command("status")
  .description("Show rotation state, last actions, and memory bank summary")
  .option("-d, --dir <path>", 'Agents directory (default: "agents/")', "agents")
  .option("--json", "Output as JSON")
  .action(async (options: { dir: string; json?: boolean }) => {
    const cwd = process.cwd();
    const agentsDir = path.resolve(cwd, options.dir);

    try {
      const statePath = path.join(agentsDir, "state", "rotation.json");
      const rosterPath = path.join(agentsDir, "roster.json");
      const bankPath = path.join(agentsDir, "memory", "bank.md");

      const state = await readRotationState(statePath);
      const roster = await readRoster(rosterPath);
      const bank = await readMemoryBank(bankPath);

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              rotation: state,
              roster: {
                company: roster.company,
                product: roster.product,
                roleCount: roster.roles.length,
                rotationOrder: roster.rotation_order,
              },
              memoryBank: {
                lines: countLines(bank),
                version: extractVersion(bank),
                cycle: extractCycle(bank),
              },
            },
            null,
            2
          )
        );
        return;
      }

      console.log("🤖 ADA — Agent Team Status\n");
      console.log(`Company: ${roster.company}`);
      console.log(`Product: ${roster.product}\n`);

      // Rotation summary
      console.log(getRotationSummary(state, roster));

      // Memory bank summary
      console.log("\n📝 Memory Bank");
      console.log("─────────────────────");
      console.log(`Lines:   ${countLines(bank)}`);
      console.log(`Version: ${extractVersion(bank)}`);
      console.log(`Cycle:   ${extractCycle(bank)}`);

      // Team overview
      console.log("\n👥 Team");
      console.log("─────────────────────");
      for (const role of roster.roles) {
        const isCurrent =
          roster.rotation_order[
            state.current_index % roster.rotation_order.length
          ] === role.id;
        const marker = isCurrent ? " ← CURRENT" : "";
        console.log(`${role.emoji} ${role.name} (${role.title})${marker}`);
      }

      console.log("");
    } catch (err) {
      console.error("❌ Could not read agent state:", (err as Error).message);
      console.error("   Run `ada init` to set up an agent team.\n");
      process.exit(1);
    }
  });
