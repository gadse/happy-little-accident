import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CardDescription } from '../CardDescription';
import { arbCardDescription } from './generators';

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('CardDescription — unit tests', () => {
  describe('valid construction', () => {
    it('accepts the empty string', () => {
      expect(CardDescription.of('').value).toBe('');
    });

    it('stores a simple description verbatim', () => {
      expect(CardDescription.of('A short note').value).toBe('A short note');
    });

    it('preserves leading/trailing whitespace verbatim', () => {
      expect(CardDescription.of('  padded  ').value).toBe('  padded  ');
    });

    it('accepts multi-byte / emoji code points verbatim', () => {
      const text = '📝 détails\nmultiline';
      expect(CardDescription.of(text).value).toBe(text);
    });
  });

  describe('length boundary', () => {
    it('accepts exactly 10,000 code points', () => {
      const text = 'a'.repeat(10_000);
      expect([...CardDescription.of(text).value].length).toBe(10_000);
    });

    it('accepts exactly 10,000 astral (surrogate-pair) code points', () => {
      const text = '😀'.repeat(10_000); // 10,000 code points, 20,000 UTF-16 units
      expect([...CardDescription.of(text).value].length).toBe(10_000);
    });

    it('throws for exactly 10,001 code points', () => {
      const text = 'a'.repeat(10_001);
      expect(() => CardDescription.of(text)).toThrowError(
        'CardDescription must be at most 10000 code points, got 10001',
      );
    });
  });

  describe('equals', () => {
    it('returns true for equal values', () => {
      expect(CardDescription.of('same').equals(CardDescription.of('same'))).toBe(
        true,
      );
    });

    it('returns false for different values', () => {
      expect(CardDescription.of('a').equals(CardDescription.of('b'))).toBe(false);
    });

    it('treats the empty string as equal to itself', () => {
      expect(CardDescription.of('').equals(CardDescription.of(''))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('CardDescription — property tests', () => {
  // Feature: domain-model, Property 8: Description round-trip verbatim — valid string → .value equals original
  it('Property 8 — .value equals the original string for any valid description', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'grapheme', minLength: 0, maxLength: 10_000 }),
        (s) => {
          expect(CardDescription.of(s).value).toBe(s);
        },
      ),
    );
  });

  // Feature: domain-model, Property 8: Description round-trip verbatim — via the shared generator
  it('Property 8 — the shared generator produces descriptions that round-trip verbatim', () => {
    fc.assert(
      fc.property(arbCardDescription, (d) => {
        expect(CardDescription.of(d.value).value).toBe(d.value);
      }),
    );
  });
});
