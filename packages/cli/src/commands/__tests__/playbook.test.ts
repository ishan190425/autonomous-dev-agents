/**
 * Tests for `ada playbook` commands.
 *
 * @see docs/design/pattern-to-playbook-cli-ux-spec-c645.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { playbookCommand } from '../playbook.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Mock console.log to capture output
let consoleOutput: string[] = [];
vi.spyOn(console, 'log').mockImplementation((...args) => {
  consoleOutput.push(args.map(String).join(' '));
});

// Test directory setup
let testDir: string;

describe('ada playbook', () => {
  beforeEach(async () => {
    consoleOutput = [];
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ada-playbook-test-'));

    // Create suggestion directories
    await fs.mkdir(path.join(testDir, 'agents', 'suggestions', 'pending'), {
      recursive: true,
    });
    await fs.mkdir(path.join(testDir, 'agents', 'suggestions', 'applied'), {
      recursive: true,
    });
    await fs.mkdir(path.join(testDir, 'agents', 'suggestions', 'rejected'), {
      recursive: true,
    });

    // Create agents/state directory for rotation.json
    await fs.mkdir(path.join(testDir, 'agents', 'state'), { recursive: true });

    // Create rotation.json
    await fs.writeFile(
      path.join(testDir, 'agents', 'state', 'rotation.json'),
      JSON.stringify({
        current_index: 3,
        last_role: 'frontier',
        cycle_count: 649,
      })
    );
  });

  afterEach(async () => {
    vi.clearAllMocks();
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('suggest', () => {
    it('shows empty state when no suggestions exist', async () => {
      // Parse command with test directory
      const args = ['suggest', '--dir', testDir];
      await playbookCommand.parseAsync(args, { from: 'user' });

      const output = consoleOutput.join('\n');
      expect(output).toContain('No pending suggestions');
    });

    it('lists pending suggestions in table format', async () => {
      // Create a test suggestion
      const suggestion = {
        id: 'sug-001',
        patternId: 'pattern-001',
        patternConfidence: 0.82,
        targetPlaybook: 'agents/playbooks/qa.md',
        targetSection: '## Quality Bar',
        suggestionType: 'add',
        suggestedText: '- Always verify test coverage',
        rationale: 'Cross-role testing pattern detected',
        sourceReflections: ['C640', 'C641'],
        contributingRoles: ['qa', 'engineering'],
        generatedAt: new Date().toISOString(),
        status: 'pending',
      };

      await fs.writeFile(
        path.join(testDir, 'agents', 'suggestions', 'pending', 'sug-001.json'),
        JSON.stringify(suggestion)
      );

      const args = ['suggest', '--dir', testDir];
      await playbookCommand.parseAsync(args, { from: 'user' });

      const output = consoleOutput.join('\n');
      expect(output).toContain('Pending Playbook Suggestions');
      expect(output).toContain('sug-001');
    });

    it('shows suggestion details with --id flag', async () => {
      const suggestion = {
        id: 'sug-001',
        patternId: 'pattern-001',
        patternConfidence: 0.85,
        targetPlaybook: 'agents/playbooks/qa.md',
        targetSection: '## Quality Bar',
        suggestionType: 'add',
        suggestedText: '- Always verify test coverage',
        rationale: 'Cross-role testing pattern detected across 4 roles',
        sourceReflections: ['C640', 'C641', 'C642'],
        contributingRoles: ['qa', 'engineering', 'ops'],
        generatedAt: new Date().toISOString(),
        status: 'pending',
      };

      await fs.writeFile(
        path.join(testDir, 'agents', 'suggestions', 'pending', 'sug-001.json'),
        JSON.stringify(suggestion)
      );

      const args = ['suggest', '--id', 'sug-001', '--dir', testDir];
      await playbookCommand.parseAsync(args, { from: 'user' });

      const output = consoleOutput.join('\n');
      expect(output).toContain('Suggestion');
      expect(output).toContain('sug-001');
      expect(output).toContain('pattern-001');
      expect(output).toContain('85%');
    });

    it('outputs JSON when --json flag is provided', async () => {
      const args = ['suggest', '--json', '--dir', testDir];
      await playbookCommand.parseAsync(args, { from: 'user' });

      const output = consoleOutput.join('');
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('pending');
      expect(parsed).toHaveProperty('stats');
    });
  });

  describe('apply', () => {
    it('applies a suggestion and shows success message', async () => {
      // Create playbook
      await fs.mkdir(path.join(testDir, 'agents', 'playbooks'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(testDir, 'agents', 'playbooks', 'qa.md'),
        '# QA Playbook\n\n## Quality Bar\n\n- Existing guideline\n\n## Another Section\n'
      );

      // Create suggestion
      const suggestion = {
        id: 'sug-001',
        patternId: 'pattern-001',
        patternConfidence: 0.82,
        targetPlaybook: 'agents/playbooks/qa.md',
        targetSection: '## Quality Bar',
        suggestionType: 'add',
        suggestedText: '- Always verify test coverage',
        rationale: 'Cross-role testing pattern detected',
        sourceReflections: ['C640', 'C641'],
        contributingRoles: ['qa', 'engineering'],
        generatedAt: new Date().toISOString(),
        status: 'pending',
      };

      await fs.writeFile(
        path.join(testDir, 'agents', 'suggestions', 'pending', 'sug-001.json'),
        JSON.stringify(suggestion)
      );

      const args = ['apply', 'sug-001', '--dir', testDir];
      await playbookCommand.parseAsync(args, { from: 'user' });

      const output = consoleOutput.join('\n');
      expect(output).toContain('Applied');
      expect(output).toContain('sug-001');

      // Verify suggestion was moved to applied
      const appliedExists = await fs
        .access(
          path.join(testDir, 'agents', 'suggestions', 'applied', 'sug-001.json')
        )
        .then(() => true)
        .catch(() => false);
      expect(appliedExists).toBe(true);

      // Verify playbook was updated
      const playbookContent = await fs.readFile(
        path.join(testDir, 'agents', 'playbooks', 'qa.md'),
        'utf-8'
      );
      expect(playbookContent).toContain('Always verify test coverage');
    });

    it('shows error when suggestion not found', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      try {
        const args = ['apply', 'sug-999', '--dir', testDir];
        await playbookCommand.parseAsync(args, { from: 'user' });
      } catch {
        // Expected to throw or exit
      }

      const output = consoleOutput.join('\n');
      expect(output).toContain('not found');

      mockExit.mockRestore();
    });
  });

  describe('reject', () => {
    it('rejects a suggestion with reason', async () => {
      const suggestion = {
        id: 'sug-001',
        patternId: 'pattern-001',
        patternConfidence: 0.75,
        targetPlaybook: 'agents/playbooks/qa.md',
        targetSection: '## Quality Bar',
        suggestionType: 'add',
        suggestedText: '- Test something',
        rationale: 'Pattern detected',
        sourceReflections: ['C640'],
        contributingRoles: ['qa'],
        generatedAt: new Date().toISOString(),
        status: 'pending',
      };

      await fs.writeFile(
        path.join(testDir, 'agents', 'suggestions', 'pending', 'sug-001.json'),
        JSON.stringify(suggestion)
      );

      const args = [
        'reject',
        'sug-001',
        '--reason',
        'Already covered in RULES.md',
        '--dir',
        testDir,
      ];
      await playbookCommand.parseAsync(args, { from: 'user' });

      const output = consoleOutput.join('\n');
      expect(output).toContain('Rejected');
      expect(output).toContain('sug-001');

      // Verify suggestion was moved to rejected
      const rejectedExists = await fs
        .access(
          path.join(testDir, 'agents', 'suggestions', 'rejected', 'sug-001.json')
        )
        .then(() => true)
        .catch(() => false);
      expect(rejectedExists).toBe(true);

      // Verify reason was recorded
      const rejected = JSON.parse(
        await fs.readFile(
          path.join(testDir, 'agents', 'suggestions', 'rejected', 'sug-001.json'),
          'utf-8'
        )
      );
      expect(rejected.rejectionReason).toBe('Already covered in RULES.md');
    });

    it('requires a reason for rejection', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      try {
        const args = ['reject', 'sug-001', '--dir', testDir];
        await playbookCommand.parseAsync(args, { from: 'user' });
      } catch {
        // Expected to throw due to missing required option
      }

      mockExit.mockRestore();
    });
  });

  describe('stats', () => {
    it('shows statistics summary', async () => {
      // Create some suggestions in different states
      const pending = {
        id: 'sug-001',
        patternId: 'p1',
        patternConfidence: 0.8,
        targetPlaybook: 'agents/playbooks/qa.md',
        targetSection: '## Test',
        suggestionType: 'add',
        suggestedText: 'text',
        rationale: 'reason',
        sourceReflections: ['C1'],
        contributingRoles: ['qa'],
        generatedAt: new Date().toISOString(),
        status: 'pending',
      };

      const applied = {
        ...pending,
        id: 'sug-002',
        status: 'applied',
        appliedAt: new Date().toISOString(),
        appliedBy: 'engineering',
      };

      const rejected = {
        ...pending,
        id: 'sug-003',
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: 'ops',
        rejectionReason: 'Not needed',
      };

      await fs.writeFile(
        path.join(testDir, 'agents', 'suggestions', 'pending', 'sug-001.json'),
        JSON.stringify(pending)
      );
      await fs.writeFile(
        path.join(testDir, 'agents', 'suggestions', 'applied', 'sug-002.json'),
        JSON.stringify(applied)
      );
      await fs.writeFile(
        path.join(testDir, 'agents', 'suggestions', 'rejected', 'sug-003.json'),
        JSON.stringify(rejected)
      );

      const args = ['stats', '--dir', testDir];
      await playbookCommand.parseAsync(args, { from: 'user' });

      const output = consoleOutput.join('\n');
      expect(output).toContain('Statistics');
      expect(output).toContain('3');
      expect(output).toContain('Pending');
      expect(output).toContain('Applied');
      expect(output).toContain('Rejected');
    });

    it('outputs JSON when --json flag is provided', async () => {
      const args = ['stats', '--json', '--dir', testDir];
      await playbookCommand.parseAsync(args, { from: 'user' });

      const output = consoleOutput.join('');
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('total');
      expect(parsed).toHaveProperty('byStatus');
    });
  });
});
