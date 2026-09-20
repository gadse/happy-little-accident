import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BoardDescription } from '../BoardDescription';
import { arbBoardDescription } from './generators';

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('BoardDescription — unit tests', () => {
  describe('valid construction', () => {
    it('accepts the empty string', () => {
      expect(BoardDescription.of('').value).toBe('');
    });

    it('stores a simple description verbatim', () => {
      expect(BoardDescription.of('Project overview').value).toBe(
        'Project overview',
      );
    });

    it('preserves leading/trailing whitespace verbatim', () => {
      expect(BoardDescription.of('  padded  ').value).toBe('  padded  ');
    });

    it('accepts multi-byte / emoji code points verbatim', () => {
      const text = '📋 aperçu\nmultiline';
      expect(BoardDescription.of(text).value).toBe(text);
    });
  });

  describe('length boundary', () => {
    it('accepts exactly 10,000 code points', () => {
      const text = 'a'.repeat(10_000);
      expect([...BoardDescription.of(text).value].length).toBe(10_000);
    });

    it('accepts exactly 10,000 astral (surrogate-pair) code points', () => {
      const text = '😀'.repeat(10_000); // 10,000 code points, 20,000 UTF-16 units
      expect([...BoardDescription.of(text).value].length).toBe(10_000);
    });

    it('throws for exactly 10,001 code points', () => {
      const text = 'a'.repeat(10_001);
      expect(() => BoardDescription.of(text)).toThrowError(
        'BoardDescription must be at most 10000 code points, got 10001',
      );
    });
  });

  describe('null / undefined rejection', () => {
    it('throws for null', () => {
      expect(
        () => BoardDescription.of(null as unknown as string),
      ).toThrowError('BoardDescription value must not be null or undefined');
    });

    it('throws for undefined', () => {
      expect(
        () => BoardDescription.of(undefined as unknown as string),
      ).toThrowError('BoardDescription value must not be null or undefined');
    });
  });

  describe('equals', () => {
    it('returns true for equal values', () => {
      expect(
        BoardDescription.of('same').equals(BoardDescription.of('same')),
      ).toBe(true);
    });

    it('returns false for different values', () => {
      expect(BoardDescription.of('a').equals(BoardDescription.of('b'))).toBe(
        false,
      );
    });

    it('treats the empty string as equal to itself', () => {
      expect(BoardDescription.of('').equals(BoardDescription.of(''))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('BoardDescription — property tests', () => {
  // Feature: domain-model, Property 8: Description round-trip verbatim — valid string → .value equals original
  it('Property 8 — .value equals the original string for any valid description', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'grapheme', minLength: 0, maxLength: 10_000 }),
        (s) => {
          expect(BoardDescription.of(s).value).toBe(s);
        },
      ),
    );
  });

  // Feature: domain-model, Property 8: Description round-trip verbatim — via the shared generator
  it('Property 8 — the shared generator produces descriptions that round-trip verbatim', () => {
    fc.assert(
      fc.property(arbBoardDescription, (d) => {
        expect(BoardDescription.of(d.value).value).toBe(d.value);
      }),
    );
  });
});
