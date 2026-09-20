import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BoardName } from '../BoardName';
import { arbValidName, arbWhitespaceOnly, arbOverlongName } from './generators';

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('BoardName — unit tests', () => {
  describe('valid construction', () => {
    it('stores a simple name verbatim', () => {
      expect(BoardName.of('Roadmap').value).toBe('Roadmap');
    });

    it('preserves leading/trailing whitespace when the name is not blank', () => {
      expect(BoardName.of('  padded  ').value).toBe('  padded  ');
    });

    it('accepts a single-character name', () => {
      expect(BoardName.of('x').value).toBe('x');
    });

    it('accepts multi-byte / emoji code points verbatim', () => {
      const name = '🗂️ tableau';
      expect(BoardName.of(name).value).toBe(name);
    });
  });

  describe('length boundary', () => {
    it('accepts exactly 2048 code points', () => {
      const name = 'a'.repeat(2048);
      expect([...BoardName.of(name).value].length).toBe(2048);
    });

    it('accepts exactly 2048 code points made of astral (surrogate-pair) chars', () => {
      const name = '😀'.repeat(2048); // 2048 code points, 4096 UTF-16 units
      const built = BoardName.of(name);
      expect([...built.value].length).toBe(2048);
    });

    it('throws for exactly 2049 code points', () => {
      const name = 'a'.repeat(2049);
      expect(() => BoardName.of(name)).toThrowError(
        'BoardName must be at most 2048 code points, got 2049',
      );
    });
  });

  describe('rejection of blank input', () => {
    it('throws for an empty string', () => {
      expect(() => BoardName.of('')).toThrowError(
        'BoardName must not be empty or whitespace-only',
      );
    });

    it('throws for a whitespace-only string', () => {
      expect(() => BoardName.of('   \t\n')).toThrowError(
        'BoardName must not be empty or whitespace-only',
      );
    });
  });

  describe('equals', () => {
    it('returns true for equal values', () => {
      expect(BoardName.of('same').equals(BoardName.of('same'))).toBe(true);
    });

    it('returns false for different values', () => {
      expect(BoardName.of('a').equals(BoardName.of('b'))).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(BoardName.of('Name').equals(BoardName.of('name'))).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('BoardName — property tests', () => {
  // Feature: domain-model, Property 5: Name round-trip verbatim — valid input → .value equals original string
  it('Property 5 — .value equals the original string for any valid name', () => {
    fc.assert(
      fc.property(arbValidName, (s) => {
        expect(BoardName.of(s).value).toBe(s);
      }),
    );
  });

  // Feature: domain-model, Property 6: Whitespace-only inputs rejected — any whitespace-only (including empty) string throws
  it('Property 6 — whitespace-only inputs throw on construction', () => {
    fc.assert(
      fc.property(arbWhitespaceOnly, (s) => {
        expect(() => BoardName.of(s)).toThrow();
      }),
    );
  });

  it('Property 6 — the empty string throws on construction', () => {
    expect(() => BoardName.of('')).toThrow();
  });

  // Feature: domain-model, Property 7: Equality is value-based — Name(a).equals(Name(b)) iff a === b
  it('Property 7 — equals() is true iff the underlying strings are identical', () => {
    fc.assert(
      fc.property(arbValidName, arbValidName, (a, b) => {
        expect(BoardName.of(a).equals(BoardName.of(b))).toBe(a === b);
      }),
    );
  });

  // Supporting property: overlong names are rejected
  it('overlong names (>2048 code points) throw on construction', () => {
    fc.assert(
      fc.property(arbOverlongName, (s) => {
        expect(() => BoardName.of(s)).toThrow();
      }),
    );
  });
});
