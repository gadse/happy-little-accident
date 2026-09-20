/**
 * A calendar due date — year, month, and day only, with no time component.
 *
 * Invariants (enforced at construction):
 * - Input must be a plain object `{ year, month, day }` with integer fields.
 *   A `Date` instance is rejected because it always carries a time component.
 * - `month` must be in the range [1, 12].
 * - `day` must be in the valid range for the given month and year, using the
 *   proleptic Gregorian leap-year rule (divisible by 4, except centuries
 *   unless also divisible by 400).
 *
 * Values are stored verbatim — a valid `{ year, month, day }` round-trips.
 */
export class DueDate {
  readonly #year: number;
  readonly #month: number;
  readonly #day: number;

  private constructor(input: { year: number; month: number; day: number }) {
    if (input instanceof Date) {
      throw new Error(
        'DueDate does not accept Date objects; pass { year, month, day } instead'
      );
    }
    if (input === null || typeof input !== 'object') {
      throw new Error(
        'DueDate does not accept Date objects; pass { year, month, day } instead'
      );
    }

    const { year, month, day } = input;

    if (!Number.isInteger(year)) {
      throw new Error(`Invalid DueDate: year must be an integer, got ${year}`);
    }
    if (!Number.isInteger(month)) {
      throw new Error(`Invalid DueDate: month must be an integer, got ${month}`);
    }
    if (!Number.isInteger(day)) {
      throw new Error(`Invalid DueDate: day must be an integer, got ${day}`);
    }

    if (month < 1 || month > 12) {
      throw new Error(`Invalid DueDate: month must be in [1, 12], got ${month}`);
    }

    const maxDay = daysInMonth(year, month);
    if (day < 1 || day > maxDay) {
      throw new Error(`Invalid DueDate: month ${month} does not have ${day} days`);
    }

    this.#year = year;
    this.#month = month;
    this.#day = day;
  }

  static of(input: { year: number; month: number; day: number }): DueDate {
    return new DueDate(input);
  }

  get year(): number {
    return this.#year;
  }

  get month(): number {
    return this.#month;
  }

  get day(): number {
    return this.#day;
  }

  equals(other: DueDate): boolean {
    return (
      this.#year === other.#year &&
      this.#month === other.#month &&
      this.#day === other.#day
    );
  }
}

/**
 * Proleptic Gregorian leap-year rule: divisible by 4, except centuries
 * unless also divisible by 400.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS: readonly number[] = [
  31, // January
  28, // February (29 in leap years)
  31, // March
  30, // April
  31, // May
  30, // June
  31, // July
  31, // August
  30, // September
  31, // October
  30, // November
  31, // December
];

/** Returns the number of days in the given 1-based month of the given year. */
function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return MONTH_LENGTHS[month - 1];
}
