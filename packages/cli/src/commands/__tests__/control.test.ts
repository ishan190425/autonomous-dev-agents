/**
 * Tests for stop, pause, and resume commands.
 *
 * Tests command structure, help text, and option validation.
 * Full integration tests would require mock file system.
 */

import { describe, it, expect } from 'vitest';
import { stopCommand } from '../stop.js';
import { pauseCommand } from '../pause.js';
import { resumeCommand } from '../resume.js';

describe('stopCommand', () => {
  it('should have correct name', () => {
    expect(stopCommand.name()).toBe('stop');
  });

  it('should have description', () => {
    expect(stopCommand.description()).toBeTruthy();
    expect(stopCommand.description()).toContain('stop');
  });

  it('should have --force option', () => {
    const forceOption = stopCommand.options.find(
      (o) => o.long === '--force' || o.short === '-f'
    );
    expect(forceOption).toBeDefined();
  });

  it('should have --dir option', () => {
    const dirOption = stopCommand.options.find((o) => o.long === '--dir');
    expect(dirOption).toBeDefined();
  });
});

describe('pauseCommand', () => {
  it('should have correct name', () => {
    expect(pauseCommand.name()).toBe('pause');
  });

  it('should have description', () => {
    expect(pauseCommand.description()).toBeTruthy();
    expect(pauseCommand.description()).toContain('pause');
  });

  it('should have --reason option', () => {
    const reasonOption = pauseCommand.options.find(
      (o) => o.long === '--reason' || o.short === '-r'
    );
    expect(reasonOption).toBeDefined();
  });

  it('should have --dir option', () => {
    const dirOption = pauseCommand.options.find((o) => o.long === '--dir');
    expect(dirOption).toBeDefined();
  });

  it('should have --no-commit option', () => {
    const commitOption = pauseCommand.options.find(
      (o) => o.long === '--no-commit'
    );
    expect(commitOption).toBeDefined();
  });
});

describe('resumeCommand', () => {
  it('should have correct name', () => {
    expect(resumeCommand.name()).toBe('resume');
  });

  it('should have description', () => {
    expect(resumeCommand.description()).toBeTruthy();
    expect(resumeCommand.description().toLowerCase()).toContain('resume');
  });

  it('should have --dir option', () => {
    const dirOption = resumeCommand.options.find((o) => o.long === '--dir');
    expect(dirOption).toBeDefined();
  });

  it('should have --no-commit option', () => {
    const commitOption = resumeCommand.options.find(
      (o) => o.long === '--no-commit'
    );
    expect(commitOption).toBeDefined();
  });
});
