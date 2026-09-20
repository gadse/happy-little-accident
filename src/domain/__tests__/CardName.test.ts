import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CardName } from '../CardName';
import { arbValidName, arbWhitespaceOnly, arbOverlongName } from './generators';

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('CardName — unit tests', () => {
  describe('valid construction', () => {
    it('stores a simple name verbatim', () => {
      expect(CardName.of('Buy milk').value).toBe('Buy milk');
    });

    it('preserves leading/trailing whitespace when the name is not blank', () => {
      expect(CardName.of('  padded  ').value).toBe('  padded  ');
    });

    it('accepts a single-character name', () => {
      expect(CardName.of('x').value).toBe('x');
    });

    it('accepts multi-byte / emoji code points verbatim', () => {
      const name = '📝 tâche';
      expect(CardName.of(name).value).toBe(name);
    });
  });

  describe('length boundary', () => {
    it('accepts exactly 2048 code points', () => {
      const name = 'a'.repeat(2048);
      expect([...CardName.of(name).value].length).toBe(2048);
    });

    it('accepts exactly 2048 code points made of astral (surrogate-pair) chars', () => {
      const name = '😀'.repeat(2048); // 2048 code points, 4096 UTF-16 units
      const built = CardName.of(name);
      expect([...built.value].length).toBe(2048);
    });

    it('throws for exactly 2049 code points', () => {
      const name = 'a'.repeat(2049);
      expect(() => CardName.of(name)).toThrowError(
        'CardName must be at most 2048 code points, got 2049',
      );
    });
  });

  describe('rejection of blank input', () => {
    it('throws for an empty string', () => {
      expect(() => CardName.of('')).toThrowError(
        'CardName must not be empty or whitespace-only',
      );
    });

    it('throws for a whitespace-only string', () => {
      expect(() => CardName.of('   \t\n')).toThrowError(
        'CardName must not be empty or whitespace-only',
      );
    });
  });

  describe('equals', () => {
    it('returns true for equal values', () => {
      expect(CardName.of('same').equals(CardName.of('same'))).toBe(true);
    });

    it('returns false for different values', () => {
      expect(CardName.of('a').equals(CardName.of('b'))).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(CardName.of('Name').equals(CardName.of('name'))).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('CardName — property tests', () => {
  // Feature: domain-model, Property 5: Name round-trip verbatim — valid input → .value equals original string
  it('Property 5 — .value equals the original string for any valid name', () => {
    fc.assert(
      fc.property(arbValidName, (s) => {
        expect(CardName.of(s).value).toBe(s);
      }),
    );
  });

  // Feature: domain-model, Property 6: Whitespace-only inputs rejected — any whitespace-only (including empty) string throws
  it('Property 6 — whitespace-only inputs throw on construction', () => {
    fc.assert(
      fc.property(arbWhitespaceOnly, (s) => {
        expect(() => CardName.of(s)).toThrow();
      }),
    );
  });

  it('Property 6 — the empty string throws on construction', () => {
    expect(() => CardName.of('')).toThrow();
  });

  // Feature: domain-model, Property 7: Equality is value-based — Name(a).equals(Name(b)) iff a === b
  it('Property 7 — equals() is true iff the underlying strings are identical', () => {
    fc.assert(
      fc.property(arbValidName, arbValidName, (a, b) => {
        expect(CardName.of(a).equals(CardName.of(b))).toBe(a === b);
      }),
    );
  });

  // Supporting property: overlong names are rejected
  it('overlong names (>2048 code points) throw on construction', () => {
    fc.assert(
      fc.property(arbOverlongName, (s) => {
        expect(() => CardName.of(s)).toThrow();
      }),
    );
  });
});
