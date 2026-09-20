import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CardCategory } from '../CardCategory';
import { arbCardCategory, arbWhitespaceOnly } from './generators';

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('CardCategory — unit tests', () => {
  describe('valid construction', () => {
    it('stores a simple category verbatim', () => {
      expect(CardCategory.of('Bug').value).toBe('Bug');
    });

    it('preserves leading/trailing whitespace when the value is not blank', () => {
      expect(CardCategory.of('  padded  ').value).toBe('  padded  ');
    });

    it('accepts a single-character category', () => {
      expect(CardCategory.of('x').value).toBe('x');
    });

    it('accepts multi-byte / emoji code points verbatim', () => {
      const category = '📝 catégorie';
      expect(CardCategory.of(category).value).toBe(category);
    });
  });

  describe('length boundary', () => {
    it('accepts exactly 100 code points', () => {
      const category = 'a'.repeat(100);
      expect([...CardCategory.of(category).value].length).toBe(100);
    });

    it('accepts exactly 100 astral (surrogate-pair) code points', () => {
      const category = '😀'.repeat(100); // 100 code points, 200 UTF-16 units
      const built = CardCategory.of(category);
      expect([...built.value].length).toBe(100);
    });

    it('throws for exactly 101 code points', () => {
      const category = 'a'.repeat(101);
      expect(() => CardCategory.of(category)).toThrowError(
        'CardCategory must be at most 100 code points, got 101',
      );
    });
  });

  describe('rejection of blank input', () => {
    it('throws for an empty string', () => {
      expect(() => CardCategory.of('')).toThrowError(
        'CardCategory must not be empty or whitespace-only',
      );
    });

    it('throws for a whitespace-only string', () => {
      expect(() => CardCategory.of('   \t\n')).toThrowError(
        'CardCategory must not be empty or whitespace-only',
      );
    });
  });

  describe('equals', () => {
    it('returns true for equal values', () => {
      expect(CardCategory.of('same').equals(CardCategory.of('same'))).toBe(true);
    });

    it('returns false for different values', () => {
      expect(CardCategory.of('a').equals(CardCategory.of('b'))).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(CardCategory.of('Bug').equals(CardCategory.of('bug'))).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('CardCategory — property tests', () => {
  // Feature: domain-model, Property 9: CardCategory round-trip and rejection — valid inputs round-trip; empty/whitespace-only/overlength inputs throw
  it('Property 9 — .value equals the original string for any valid category', () => {
    fc.assert(
      fc.property(
        fc
          .string({ unit: 'grapheme', minLength: 1, maxLength: 100 })
          .filter((s) => s.trim() !== ''),
        (s) => {
          expect(CardCategory.of(s).value).toBe(s);
        },
      ),
    );
  });

  // Feature: domain-model, Property 9: CardCategory round-trip and rejection — valid inputs round-trip; empty/whitespace-only/overlength inputs throw
  it('Property 9 — the shared generator produces categories that round-trip verbatim', () => {
    fc.assert(
      fc.property(arbCardCategory, (c) => {
        expect(CardCategory.of(c.value).value).toBe(c.value);
      }),
    );
  });

  // Feature: domain-model, Property 9: CardCategory round-trip and rejection — valid inputs round-trip; empty/whitespace-only/overlength inputs throw
  it('Property 9 — whitespace-only inputs throw on construction', () => {
    fc.assert(
      fc.property(arbWhitespaceOnly, (s) => {
        expect(() => CardCategory.of(s)).toThrow();
      }),
    );
  });

  it('Property 9 — the empty string throws on construction', () => {
    expect(() => CardCategory.of('')).toThrow();
  });

  // Feature: domain-model, Property 9: CardCategory round-trip and rejection — valid inputs round-trip; empty/whitespace-only/overlength inputs throw
  it('Property 9 — overlength inputs (>100 code points) throw on construction', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'grapheme', minLength: 101, maxLength: 300 }),
        (s) => {
          fc.pre([...s].length > 100);
          expect(() => CardCategory.of(s)).toThrow();
        },
      ),
    );
  });
});
