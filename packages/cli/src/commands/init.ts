/**
 * `ada init` — Initialize an agent team in the current repository.
 *
 * Copies template files into the repo's agents/ directory,
 * customizes the roster, and sets up the initial state.
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '@ada/core';
import type { Roster, RotationState, AdaConfig } from '@ada/core';

interface InitOptions {
  template: string;
  teamSize: 'small' | 'medium' | 'large' | undefined;
  focus: 'product' | 'engineering' | 'research' | 'ops' | 'balanced' | undefined;
  overwrite: boolean;
  dir: string;
}

interface TeamSizeConfig {
  roleCount: number;
  description: string;
  roles: string[];
}

const TEAM_SIZES: Record<string, TeamSizeConfig> = {
  small: {
    roleCount: 3,
    description: 'Solo developer (CEO, Engineering, Ops)',
    roles: ['ceo', 'engineering', 'ops'],
  },
  medium: {
    roleCount: 5, 
    description: 'Small team (CEO, Product, Engineering, Ops, Research)',
    roles: ['ceo', 'product', 'engineering', 'ops', 'research'],
  },
  large: {
    roleCount: 8,
    description: 'Full team (all roles)',
    roles: ['ceo', 'growth', 'research', 'product', 'scrum', 'engineering', 'ops', 'design'],
  },
} as const;

export const initCommand = new Command('init')
  .description('Initialize an autonomous agent team in the current repo')
  .option('-t, --template <name>', 'Template to use (default: "default")', 'default')
  .option('--team-size <size>', 'Team size: small|medium|large')
  .option('--focus <area>', 'Primary focus: product|engineering|research|ops|balanced')
  .option('-f, --overwrite', 'Overwrite existing agent configuration', false)
  .option('-d, --dir <path>', 'Target directory for agents (default: "agents/")', 'agents')
  .action(async (options: InitOptions) => {
    try {
      await initializeAgentTeam(options);
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize agent team:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

async function initializeAgentTeam(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const agentsDir = path.resolve(cwd, options.dir);

  console.log(chalk.bold.blue('🤖 Autonomous Dev Agents — Team Initialization\n'));

  // Check if agents directory exists
  const agentsExists = await directoryExists(agentsDir);
  if (agentsExists && !options.overwrite) {
    console.log(chalk.yellow(`⚠️  Directory "${options.dir}" already exists.`));
    console.log(chalk.gray('   Use --overwrite to replace it, or --dir to specify a different directory.\n'));
    process.exit(1);
  }

  if (agentsExists && options.overwrite) {
    console.log(chalk.yellow(`🗑️  Overwriting existing directory "${options.dir}"\n`));
    await fs.rm(agentsDir, { recursive: true, force: true });
  }

  // Determine project context
  const projectInfo = await detectProjectContext(cwd);
  console.log(chalk.gray(`📋 Detected: ${projectInfo.type} project\n`));

  // Get team configuration
  const teamConfig = await getTeamConfiguration(options, projectInfo);
  
  console.log(chalk.blue(`🎯 Configuration:`));
  console.log(chalk.gray(`   Template: ${teamConfig.template}`));
  console.log(chalk.gray(`   Team size: ${teamConfig.teamSize} (${TEAM_SIZES[teamConfig.teamSize]?.description || 'Unknown'})`));
  console.log(chalk.gray(`   Focus: ${teamConfig.focus}`));
  console.log(chalk.gray(`   Target: ${agentsDir}\n`));

  // Copy template files
  await copyTemplateFiles(teamConfig.template, agentsDir);
  
  // Customize roster based on team size and focus
  await customizeRoster(agentsDir, teamConfig);
  
  // Initialize rotation state
  await initializeRotationState(agentsDir, teamConfig);
  
  // Create initial memory bank
  await createInitialMemoryBank(agentsDir, teamConfig, projectInfo);
  
  // Create ada config
  await createAdaConfig(agentsDir);

  console.log(chalk.green('✅ Agent team initialized successfully!\n'));
  
  console.log(chalk.bold('Next steps:'));
  console.log(chalk.gray('  1.') + ' Review configuration: ' + chalk.cyan(`${options.dir}/roster.json`));
  console.log(chalk.gray('  2.') + ' Customize playbooks: ' + chalk.cyan(`${options.dir}/playbooks/*.md`));
  console.log(chalk.gray('  3.') + ' Run first cycle: ' + chalk.cyan('ada run'));
  console.log(chalk.gray('  4.') + ' Check status: ' + chalk.cyan('ada status') + '\n');
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

interface ProjectInfo {
  type: string;
  hasPackageJson: boolean;
  isGitRepo: boolean;
  suggestedTemplate: string;
}

async function detectProjectContext(cwd: string): Promise<ProjectInfo> {
  const packageJsonExists = await fileExists(path.join(cwd, 'package.json'));
  const gitExists = await directoryExists(path.join(cwd, '.git'));
  
  let projectType = 'general';
  let suggestedTemplate = 'default';
  
  if (packageJsonExists) {
    try {
      const packageJsonContent = await fs.readFile(path.join(cwd, 'package.json'), 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      
      if (packageJson.dependencies?.['next'] || packageJson.devDependencies?.['next']) {
        projectType = 'Next.js web app';
        suggestedTemplate = 'web-app';
      } else if (packageJson.dependencies?.['react'] || packageJson.devDependencies?.['react']) {
        projectType = 'React app';
        suggestedTemplate = 'web-app';
      } else if (packageJson.bin) {
        projectType = 'CLI tool';
        suggestedTemplate = 'cli-tool';
      } else if (packageJson.dependencies?.['express'] || packageJson.dependencies?.['fastify']) {
        projectType = 'API service';
        suggestedTemplate = 'api-service';
      } else {
        projectType = 'Node.js project';
      }
    } catch {
      // Failed to parse package.json, use defaults
    }
  }
  
  return {
    type: projectType,
    hasPackageJson: packageJsonExists,
    isGitRepo: gitExists,
    suggestedTemplate,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

interface TeamConfig {
  template: string;
  teamSize: 'small' | 'medium' | 'large';
  focus: 'product' | 'engineering' | 'research' | 'ops' | 'balanced';
  companyName: string;
  productName: string;
}

async function getTeamConfiguration(options: InitOptions, projectInfo: ProjectInfo): Promise<TeamConfig> {
  // For now, use defaults and options. Later we can add interactive prompts.
  const teamSize = options.teamSize ?? (projectInfo.type === 'general' ? 'small' : 'medium');
  const focus = options.focus ?? 'balanced';
  
  // Attempt to get project name from package.json or directory
  let productName = 'My Project';
  let companyName = 'My Company';
  
  if (projectInfo.hasPackageJson) {
    try {
      const packageJsonContent = await fs.readFile('package.json', 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      productName = packageJson.name || path.basename(process.cwd());
      
      // Handle author field which could be string or object
      if (typeof packageJson.author === 'string') {
        companyName = packageJson.author;
      } else if (packageJson.author && typeof packageJson.author === 'object' && packageJson.author.name) {
        companyName = packageJson.author.name;
      }
    } catch {
      productName = path.basename(process.cwd());
    }
  } else {
    productName = path.basename(process.cwd());
  }
  
  return {
    template: options.template,
    teamSize,
    focus,
    companyName,
    productName,
  };
}

async function copyTemplateFiles(templateName: string, targetDir: string): Promise<void> {
  // Find the CLI package root and locate templates
  const cliRoot = path.dirname(path.dirname(__dirname)); // ../../ from dist/commands/
  const templatesDir = path.join(cliRoot, '..', '..', 'templates');
  const templateSource = path.join(templatesDir, 'agents');
  
  console.log(chalk.blue('📁 Copying template files...'));
  
  await copyRecursively(templateSource, targetDir);
  
  console.log(chalk.green('✅ Template files copied\n'));
}

async function copyRecursively(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
  
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    
    if (entry.isDirectory()) {
      await copyRecursively(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function customizeRoster(agentsDir: string, config: TeamConfig): Promise<void> {
  const rosterPath = path.join(agentsDir, 'roster.json');
  
  console.log(chalk.blue('⚙️  Customizing team roster...'));
  
  // Read the template roster
  const rosterContent = await fs.readFile(rosterPath, 'utf-8');
  const roster: Roster = JSON.parse(rosterContent);
  
  // Get team size configuration
  const teamSizeConfig = TEAM_SIZES[config.teamSize];
  if (!teamSizeConfig) {
    throw new Error(`Unknown team size: ${config.teamSize}`);
  }
  
  // Filter roles based on team size
  const filteredRoles = roster.roles.filter(role => teamSizeConfig.roles.includes(role.id));
  
  // Create customized roster (creating new object to avoid readonly issues)
  const customizedRoster: Roster = {
    company: config.companyName,
    product: config.productName,
    tagline: roster.tagline,
    roles: filteredRoles,
    rotation_order: teamSizeConfig.roles,
  };
  
  // Write the customized roster
  await fs.writeFile(rosterPath, JSON.stringify(customizedRoster, null, 2) + '\n');
  
  console.log(chalk.green(`✅ Roster configured (${filteredRoles.length} roles)\n`));
}

async function initializeRotationState(agentsDir: string, config: TeamConfig): Promise<void> {
  const statePath = path.join(agentsDir, 'state', 'rotation.json');
  
  console.log(chalk.blue('🔄 Initializing rotation state...'));
  
  const initialState: RotationState = {
    current_index: 0,
    last_role: null,
    last_run: null,
    cycle_count: 0,
    history: [],
  };
  
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(initialState, null, 2) + '\n');
  
  console.log(chalk.green('✅ Rotation state initialized\n'));
}

async function createInitialMemoryBank(agentsDir: string, config: TeamConfig, projectInfo: ProjectInfo): Promise<void> {
  const memoryPath = path.join(agentsDir, 'memory', 'bank.md');
  
  console.log(chalk.blue('🧠 Creating initial memory bank...'));
  
  const today = new Date().toISOString().split('T')[0];
  const teamSizeConfig = TEAM_SIZES[config.teamSize];
  
  if (!teamSizeConfig) {
    throw new Error(`Unknown team size: ${config.teamSize}`);
  }
  
  // Generate role state sections
  const roleStates = teamSizeConfig.roles.map((roleId) => {
    // Simple role name mapping - in a real implementation this would come from the roster
    const roleNames: Record<string, string> = {
      ceo: '👔 CEO — The Founder',
      product: '📦 Product — The PM', 
      engineering: '⚙️ Engineering — The Builder',
      ops: '🛡️ Ops — The Guardian',
      research: '🔬 Research — The Scout',
      growth: '🚀 Growth — The Dealmaker',
      scrum: '📋 Scrum — The Coordinator',
      design: '🎨 Design — The Architect',
    };
    
    return `### ${roleNames[roleId] || `${roleId} — Role`}
- **Last action:** —
- **Working on:** Initial setup and project analysis
- **Next:** Analyze project and establish priorities`;
  }).join('\n\n');
  
  const initialMemory = `# 🧠 Memory Bank

> The shared brain of the ${config.companyName} autonomous development team.
> Every role reads this. Critical roles update it.
> **Last updated:** — | **Cycle:** 0 | **Version:** 1

---

## Current Status

### Active Sprint
- **Sprint 1: Getting Started**
- Goal: Set up project foundation and establish team workflow
- Key items:
  - [x] Initialize autonomous agent team
  - [ ] Define project goals and priorities
  - [ ] Set up development workflow
  - [ ] Create initial documentation

### In Progress
- Team setup and onboarding
- Project context analysis

### Blockers
- (none yet)

### Recent Decisions
- INIT-001: Chose ${config.teamSize} team size with ${config.focus} focus
- INIT-002: Using ${config.template} template for ${projectInfo.type}

---

## Architecture Decisions

| ID | Decision | Rationale | Date | Author |
|----|----------|-----------|------|--------|
| INIT-001 | ${config.teamSize} team configuration | Matches project size and current needs | ${today} | ADA Init |
| INIT-002 | ${config.focus} focus area | Aligns with project priorities | ${today} | ADA Init |

---

## Active Threads

### Cross-Role Dependencies
- All roles need to review project context and establish priorities
- Development workflow needs to be defined

### Open Questions
- What are the immediate project priorities?
- What development practices should we establish?
- How should we organize our work and releases?

---

## Role State

${roleStates}

---

## Lessons Learned

| # | Lesson | Context | Date |
|---|--------|---------|------|

---

## Project Metrics

- **Total issues:** 0
- **Open PRs:** 0
- **Merged PRs:** 0
- **Completed cycles:** 0
- **Test count:** 0

---

## Project Context

- **Type:** ${projectInfo.type}
- **Git repository:** ${projectInfo.isGitRepo ? 'Yes' : 'No'}
- **Package.json:** ${projectInfo.hasPackageJson ? 'Yes' : 'No'}
- **Template used:** ${config.template}

---

*This bank is compressed periodically. Archives live in \`agents/memory/archives/\`.*
`;
  
  await fs.mkdir(path.dirname(memoryPath), { recursive: true });
  await fs.writeFile(memoryPath, initialMemory);
  
  console.log(chalk.green('✅ Initial memory bank created\n'));
}

async function createAdaConfig(agentsDir: string): Promise<void> {
  const configPath = path.join(agentsDir, 'config.json');
  
  console.log(chalk.blue('📝 Creating ADA configuration...'));
  
  const config: AdaConfig = {
    ...DEFAULT_CONFIG,
    agentsDir: path.relative(process.cwd(), agentsDir),
  };
  
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  
  console.log(chalk.green('✅ Configuration file created\n'));
}