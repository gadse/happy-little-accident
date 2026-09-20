import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Timestamp } from '../Timestamp';
import { arbTimestamp } from './generators';

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('Timestamp — construction', () => {
  it('constructs from a Date and round-trips its instant', () => {
    const d = new Date('2026-01-15T10:00:00.000Z');
    const ts = Timestamp.of(d);
    expect(ts.epochMillis).toBe(d.getTime());
  });

  it('constructs from epoch milliseconds and round-trips them', () => {
    const millis = 1_760_000_000_000;
    const ts = Timestamp.of(millis);
    expect(ts.epochMillis).toBe(millis);
  });

  it('accepts 0 (the Unix epoch)', () => {
    expect(Timestamp.of(0).epochMillis).toBe(0);
  });

  it('accepts negative epoch millis (instants before 1970)', () => {
    expect(Timestamp.of(-1000).epochMillis).toBe(-1000);
  });
});

describe('Timestamp — invalid inputs', () => {
  const message = 'Invalid Timestamp: expected a valid Date or finite epoch millis';

  it('throws for an invalid Date (NaN time)', () => {
    expect(() => Timestamp.of(new Date('not a date'))).toThrow(message);
  });

  it('throws for NaN', () => {
    expect(() => Timestamp.of(NaN)).toThrow(message);
  });

  it('throws for Infinity', () => {
    expect(() => Timestamp.of(Infinity)).toThrow(message);
  });

  it('throws for -Infinity', () => {
    expect(() => Timestamp.of(-Infinity)).toThrow(message);
  });
});

describe('Timestamp — toDate', () => {
  it('returns a Date representing the same instant', () => {
    const millis = 1_760_000_000_000;
    const ts = Timestamp.of(millis);
    expect(ts.toDate().getTime()).toBe(millis);
  });

  it('returns a distinct Date instance on every call', () => {
    const ts = Timestamp.of(0);
    const a = ts.toDate();
    const b = ts.toDate();
    expect(a).not.toBe(b);
    expect(a.getTime()).toBe(b.getTime());
  });
});

describe('Timestamp — immutability / no aliasing', () => {
  it('does not retain the source Date reference', () => {
    const d = new Date('2026-01-15T10:00:00.000Z');
    const original = d.getTime();
    const ts = Timestamp.of(d);
    d.setFullYear(1999);
    expect(ts.epochMillis).toBe(original);
  });

  it('cannot be mutated through the Date returned by toDate()', () => {
    const ts = Timestamp.of(0);
    const returned = ts.toDate();
    returned.setFullYear(1999);
    expect(ts.epochMillis).toBe(0);
  });
});

describe('Timestamp — equals', () => {
  it('returns true for the same instant', () => {
    expect(Timestamp.of(1000).equals(Timestamp.of(1000))).toBe(true);
  });

  it('returns true across Date and millis constructions of the same instant', () => {
    const millis = 1_760_000_000_000;
    expect(Timestamp.of(new Date(millis)).equals(Timestamp.of(millis))).toBe(true);
  });

  it('returns false for different instants', () => {
    expect(Timestamp.of(1000).equals(Timestamp.of(2000))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Timestamp — property-based', () => {
  // Feature: domain-model, Property 21: Timestamp is immutable and does not alias its source — mutating the source Date after construction, or the Date returned by toDate(), does not change epochMillis; a.equals(b) iff a.epochMillis === b.epochMillis; invalid Date / non-finite number throws.
  it('Property 21: mutating the source Date does not change epochMillis', () => {
    fc.assert(
      fc.property(fc.date({ noInvalidDate: true }), (d) => {
        const original = d.getTime();
        const ts = Timestamp.of(d);
        d.setFullYear(d.getFullYear() + 1);
        expect(ts.epochMillis).toBe(original);
      }),
    );
  });

  it('Property 21: mutating the Date returned by toDate() does not change epochMillis', () => {
    fc.assert(
      fc.property(arbTimestamp, (ts) => {
        const original = ts.epochMillis;
        const returned = ts.toDate();
        returned.setFullYear(returned.getFullYear() + 1);
        expect(ts.epochMillis).toBe(original);
      }),
    );
  });

  it('Property 21: equals is true iff epochMillis are equal', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        const ta = Timestamp.of(a);
        const tb = Timestamp.of(b);
        expect(ta.equals(tb)).toBe(a === b);
      }),
    );
  });

  it('Property 21: a Timestamp always equals another built from the same instant', () => {
    fc.assert(
      fc.property(arbTimestamp, (ts) => {
        expect(ts.equals(Timestamp.of(ts.epochMillis))).toBe(true);
      }),
    );
  });

  it('Property 21: a non-finite number always throws', () => {
    fc.assert(
      fc.property(fc.constantFrom(NaN, Infinity, -Infinity), (n) => {
        expect(() => Timestamp.of(n)).toThrow();
      }),
    );
  });
});
