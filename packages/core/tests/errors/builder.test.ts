/**
 * @file Tests for ErrorBuilder fluent API
 * @description Tests the fluent builder pattern for constructing AdaError instances
 */

import { describe, it, expect } from 'vitest';
import { ErrorBuilder, adaError } from '../../src/errors/builder.js';
import { AdaError } from '../../src/errors/error.js';

describe('ErrorBuilder', () => {
  describe('basic construction', () => {
    it('builds AdaError with just code', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED').build();

      expect(error).toBeInstanceOf(AdaError);
      expect(error.code).toBe('ADA_NOT_INITIALIZED');
    });
  });

  describe('message', () => {
    it('overrides default message', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .message('Custom error message')
        .build();

      expect(error.message).toBe('Custom error message');
    });
  });

  describe('context methods', () => {
    it('sets command context', () => {
      const error = new ErrorBuilder('ADA_MISSING_ACTION')
        .context('dispatch complete')
        .build();

      expect(error.context?.command).toBe('dispatch complete');
    });

    it('sets working directory', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .workDir('/home/user/project')
        .build();

      expect(error.context?.workingDir).toBe('/home/user/project');
    });

    it('sets flags', () => {
      const error = new ErrorBuilder('ADA_MISSING_ACTION')
        .flags(['--reflection', '--verbose'])
        .build();

      expect(error.context?.flags).toEqual(['--reflection', '--verbose']);
    });

    it('sets missing flag', () => {
      const error = new ErrorBuilder('ADA_MISSING_ACTION')
        .missingFlag('--action')
        .build();

      expect(error.context?.missingFlag).toBe('--action');
    });

    it('sets git status', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .git(true)
        .build();

      expect(error.context?.hasGit).toBe(true);
    });

    it('sets ada status', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .ada(false)
        .build();

      expect(error.context?.hasAda).toBe(false);
    });

    it('combines multiple context values', () => {
      const error = new ErrorBuilder('ADA_MISSING_ACTION')
        .context('dispatch complete')
        .workDir('/home/user/project')
        .flags(['--reflection'])
        .missingFlag('--action')
        .git(true)
        .ada(true)
        .build();

      expect(error.context).toEqual({
        command: 'dispatch complete',
        workingDir: '/home/user/project',
        flags: ['--reflection'],
        missingFlag: '--action',
        hasGit: true,
        hasAda: true,
      });
    });
  });

  describe('detail methods', () => {
    it('adds single detail', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .detail('missingFile', 'rotation.json')
        .build();

      expect(error.details).toEqual({ missingFile: 'rotation.json' });
    });

    it('adds multiple details with detail()', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .detail('missingFile', 'rotation.json')
        .detail('expectedPath', 'agents/state/')
        .build();

      expect(error.details).toEqual({
        missingFile: 'rotation.json',
        expectedPath: 'agents/state/',
      });
    });

    it('adds multiple details with details()', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .details({
          missingFile: 'rotation.json',
          expectedPath: 'agents/state/',
        })
        .build();

      expect(error.details).toEqual({
        missingFile: 'rotation.json',
        expectedPath: 'agents/state/',
      });
    });

    it('merges details from both methods', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .detail('first', '1')
        .details({ second: '2', third: '3' })
        .detail('fourth', '4')
        .build();

      expect(error.details).toEqual({
        first: '1',
        second: '2',
        third: '3',
        fourth: '4',
      });
    });
  });

  describe('suggestion methods', () => {
    it('adds suggestion without options', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .suggest('Try this fix')
        .build();

      const customSuggestion = error.suggestions.find(
        (s) => s.action === 'Try this fix'
      );
      expect(customSuggestion).toBeDefined();
      expect(customSuggestion?.primary).toBe(false);
    });

    it('adds primary suggestion', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .suggest('Primary fix', { primary: true })
        .build();

      const customSuggestion = error.suggestions.find(
        (s) => s.action === 'Primary fix'
      );
      expect(customSuggestion?.primary).toBe(true);
    });

    it('adds suggestion with command', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .suggest('Run initialization', { command: 'ada init' })
        .build();

      const customSuggestion = error.suggestions.find(
        (s) => s.action === 'Run initialization'
      );
      expect(customSuggestion?.command).toBe('ada init');
    });

    it('suggestPrimary adds primary suggestion with command', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .suggestPrimary('Initialize now', 'ada init')
        .build();

      const customSuggestion = error.suggestions.find(
        (s) => s.action === 'Initialize now'
      );
      expect(customSuggestion?.primary).toBe(true);
      expect(customSuggestion?.command).toBe('ada init');
    });

    it('replaceSuggestions removes defaults', () => {
      const error = new ErrorBuilder('ADA_NOT_INITIALIZED')
        .replaceSuggestions()
        .suggest('Only this', { primary: true })
        .build();

      expect(error.suggestions).toHaveLength(1);
      expect(error.suggestions[0].action).toBe('Only this');
    });
  });

  describe('cause', () => {
    it('sets cause error', () => {
      const original = new Error('Original failure');
      const error = new ErrorBuilder('ADA_UNKNOWN_ERROR')
        .cause(original)
        .build();

      expect(error.cause).toBe(original);
    });
  });

  describe('throw', () => {
    it('throws the built error', () => {
      expect(() => {
        new ErrorBuilder('ADA_NOT_INITIALIZED').throw();
      }).toThrow(AdaError);
    });

    it('thrown error has correct code', () => {
      try {
        new ErrorBuilder('ADA_NOT_INITIALIZED')
          .detail('test', 'value')
          .throw();
      } catch (error) {
        expect(AdaError.isAdaError(error)).toBe(true);
        if (AdaError.isAdaError(error)) {
          expect(error.code).toBe('ADA_NOT_INITIALIZED');
          expect(error.details).toEqual({ test: 'value' });
        }
      }
    });
  });

  describe('full chain', () => {
    it('supports full fluent chain', () => {
      const error = new ErrorBuilder('ADA_MISSING_ACTION')
        .message('Missing required action flag')
        .context('dispatch complete')
        .workDir('/home/user/project')
        .flags(['--reflection'])
        .missingFlag('--action')
        .git(true)
        .ada(true)
        .detail('expectedFlag', '--action')
        .detail('receivedFlags', ['--reflection'])
        .suggestPrimary('Add the --action flag', 'ada dispatch complete --action "..."')
        .suggest('See help for more options', { command: 'ada dispatch complete --help' })
        .build();

      expect(error.code).toBe('ADA_MISSING_ACTION');
      expect(error.message).toBe('Missing required action flag');
      expect(error.context?.command).toBe('dispatch complete');
      expect(error.context?.missingFlag).toBe('--action');
      expect(error.details.expectedFlag).toBe('--action');
    });
  });
});

describe('adaError factory', () => {
  it('creates ErrorBuilder', () => {
    const builder = adaError('ADA_NOT_INITIALIZED');
    expect(builder).toBeInstanceOf(ErrorBuilder);
  });

  it('can build error', () => {
    const error = adaError('ADA_NOT_INITIALIZED')
      .detail('test', 'value')
      .build();

    expect(error).toBeInstanceOf(AdaError);
    expect(error.code).toBe('ADA_NOT_INITIALIZED');
  });
});
