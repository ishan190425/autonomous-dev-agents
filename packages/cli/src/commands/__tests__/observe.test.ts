/**
 * Tests for observe and costs commands.
 *
 * Tests command structure, help text, and option validation.
 * Full integration tests would require mock file system.
 */

import { describe, it, expect } from 'vitest';
import { observeCommand } from '../observe.js';
import { costsCommand } from '../costs.js';

describe('observeCommand', () => {
  it('should have correct name', () => {
    expect(observeCommand.name()).toBe('observe');
  });

  it('should have description mentioning observability', () => {
    expect(observeCommand.description()).toBeTruthy();
    expect(observeCommand.description().toLowerCase()).toContain('observability');
  });

  it('should have --dir option', () => {
    const dirOption = observeCommand.options.find((o) => o.long === '--dir');
    expect(dirOption).toBeDefined();
  });

  it('should have --by-role option', () => {
    const byRoleOption = observeCommand.options.find(
      (o) => o.long === '--by-role'
    );
    expect(byRoleOption).toBeDefined();
  });

  it('should have --cycle option', () => {
    const cycleOption = observeCommand.options.find(
      (o) => o.long === '--cycle'
    );
    expect(cycleOption).toBeDefined();
  });

  it('should have --last option', () => {
    const lastOption = observeCommand.options.find((o) => o.long === '--last');
    expect(lastOption).toBeDefined();
  });

  it('should have --json option', () => {
    const jsonOption = observeCommand.options.find((o) => o.long === '--json');
    expect(jsonOption).toBeDefined();
  });
});

describe('costsCommand', () => {
  it('should have correct name', () => {
    expect(costsCommand.name()).toBe('costs');
  });

  it('should have description mentioning cost', () => {
    expect(costsCommand.description()).toBeTruthy();
    expect(costsCommand.description().toLowerCase()).toContain('cost');
  });

  it('should have --dir option', () => {
    const dirOption = costsCommand.options.find((o) => o.long === '--dir');
    expect(dirOption).toBeDefined();
  });

  it('should have --json option', () => {
    const jsonOption = costsCommand.options.find((o) => o.long === '--json');
    expect(jsonOption).toBeDefined();
  });
});
