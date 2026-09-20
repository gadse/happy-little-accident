import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { DueDate } from '../DueDate';
import { arbDueDate } from './generators';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Proleptic Gregorian leap-year rule: divisible by 4, except centuries
 * unless also divisible by 400.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Number of days in the given 1-based month of the given year. */
function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1];
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('DueDate — unit tests', () => {
  describe('valid construction', () => {
    it('stores year, month, and day verbatim', () => {
      const d = DueDate.of({ year: 2024, month: 6, day: 15 });
      expect(d.year).toBe(2024);
      expect(d.month).toBe(6);
      expect(d.day).toBe(15);
    });

    it('accepts Feb 29 on a leap year (2024)', () => {
      const d = DueDate.of({ year: 2024, month: 2, day: 29 });
      expect(d.year).toBe(2024);
      expect(d.month).toBe(2);
      expect(d.day).toBe(29);
    });

    it('accepts Feb 29 on a year divisible by 400 (2000)', () => {
      const d = DueDate.of({ year: 2000, month: 2, day: 29 });
      expect(d.day).toBe(29);
    });

    it('accepts Dec 31', () => {
      const d = DueDate.of({ year: 2023, month: 12, day: 31 });
      expect(d.month).toBe(12);
      expect(d.day).toBe(31);
    });
  });

  describe('rejection of invalid dates', () => {
    it('throws for Feb 29 on a non-leap year (2023)', () => {
      expect(() => DueDate.of({ year: 2023, month: 2, day: 29 })).toThrow();
    });

    it('throws for Feb 29 on a century non-leap year (1900)', () => {
      expect(() => DueDate.of({ year: 1900, month: 2, day: 29 })).toThrow();
    });

    it('throws for month 0', () => {
      expect(() => DueDate.of({ year: 2024, month: 0, day: 1 })).toThrow();
    });

    it('throws for month 13', () => {
      expect(() => DueDate.of({ year: 2024, month: 13, day: 1 })).toThrow();
    });

    it('throws for day 0', () => {
      expect(() => DueDate.of({ year: 2024, month: 1, day: 0 })).toThrow();
    });

    it('throws for April 31 (only 30 days)', () => {
      expect(() => DueDate.of({ year: 2024, month: 4, day: 31 })).toThrow();
    });
  });

  describe('rejection of Date objects', () => {
    it('throws when passed a Date instance', () => {
      // @ts-expect-error — a Date is intentionally not a valid DueDate input
      expect(() => DueDate.of(new Date(2024, 5, 15))).toThrow();
    });
  });

  describe('equals', () => {
    it('returns true for equal dates', () => {
      expect(
        DueDate.of({ year: 2024, month: 6, day: 15 }).equals(
          DueDate.of({ year: 2024, month: 6, day: 15 }),
        ),
      ).toBe(true);
    });

    it('returns false for different dates', () => {
      expect(
        DueDate.of({ year: 2024, month: 6, day: 15 }).equals(
          DueDate.of({ year: 2024, month: 6, day: 16 }),
        ),
      ).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('DueDate — property tests', () => {
  // Feature: domain-model, Property 10: DueDate round-trip — valid { year, month, day } → accessors return same integers
  it('Property 10 — the shared generator produces dates that round-trip', () => {
    fc.assert(
      fc.property(arbDueDate, (d) => {
        const rebuilt = DueDate.of({ year: d.year, month: d.month, day: d.day });
        expect(rebuilt.year).toBe(d.year);
        expect(rebuilt.month).toBe(d.month);
        expect(rebuilt.day).toBe(d.day);
      }),
    );
  });

  // Feature: domain-model, Property 10: DueDate round-trip — valid { year, month, day } → accessors return same integers
  it('Property 10 — accessors return the same integers passed to the constructor', () => {
    const arbValidTriple = fc
      .integer({ min: 1, max: 12 })
      .chain((month) =>
        fc
          .integer({ min: 1900, max: 2100 })
          .chain((year) =>
            fc
              .integer({ min: 1, max: daysInMonth(year, month) })
              .map((day) => ({ year, month, day })),
          ),
      );

    fc.assert(
      fc.property(arbValidTriple, ({ year, month, day }) => {
        const d = DueDate.of({ year, month, day });
        expect(d.year).toBe(year);
        expect(d.month).toBe(month);
        expect(d.day).toBe(day);
      }),
    );
  });

  // Feature: domain-model, Property 11: DueDate rejects invalid inputs — out-of-range month/day and Date objects throw
  it('Property 11 — a month below 1 throws', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 2100 }),
        fc.integer({ min: -1000, max: 0 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          expect(() => DueDate.of({ year, month, day })).toThrow();
        },
      ),
    );
  });

  // Feature: domain-model, Property 11: DueDate rejects invalid inputs — out-of-range month/day and Date objects throw
  it('Property 11 — a month above 12 throws', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 2100 }),
        fc.integer({ min: 13, max: 1000 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          expect(() => DueDate.of({ year, month, day })).toThrow();
        },
      ),
    );
  });

  // Feature: domain-model, Property 11: DueDate rejects invalid inputs — out-of-range month/day and Date objects throw
  it('Property 11 — a day below 1 throws', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: -1000, max: 0 }),
        (year, month, day) => {
          expect(() => DueDate.of({ year, month, day })).toThrow();
        },
      ),
    );
  });

  // Feature: domain-model, Property 11: DueDate rejects invalid inputs — out-of-range month/day and Date objects throw
  it('Property 11 — a day exceeding the days in the given month throws', () => {
    const arbOverflowingDay = fc
      .integer({ min: 1, max: 12 })
      .chain((month) =>
        fc
          .integer({ min: 1900, max: 2100 })
          .chain((year) => {
            const maxDay = daysInMonth(year, month);
            return fc
              .integer({ min: maxDay + 1, max: 100 })
              .map((day) => ({ year, month, day }));
          }),
      );

    fc.assert(
      fc.property(arbOverflowingDay, ({ year, month, day }) => {
        expect(() => DueDate.of({ year, month, day })).toThrow();
      }),
    );
  });

  // Feature: domain-model, Property 11: DueDate rejects invalid inputs — out-of-range month/day and Date objects throw
  it('Property 11 — passing a Date object throws', () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        // @ts-expect-error — a Date is intentionally not a valid DueDate input
        expect(() => DueDate.of(date)).toThrow();
      }),
    );
  });
});
