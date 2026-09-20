import type { CardId } from './EntityId';
import type { Timestamp } from './Timestamp';
import { Card } from './Card';

/**
 * Copies a card to a new identity at a paste timestamp.
 *
 * Produces a brand-new {@link Card} that shares the source card's data fields
 * (`name`, `description`, `category`, `dueDate`) but takes a fresh `id` and
 * treats the paste moment as its creation time: both `createdAt` and
 * `lastModifiedAt` are set to `pasteAt` (Requirements 10.2, 10.3).
 *
 * Absent optional fields on `source` remain absent on the copy — they are
 * omitted via conditional spread rather than being set to `undefined`
 * (Requirement 10.5), mirroring the construction pattern in {@link Card}.
 *
 * The returned card is always a distinct object from `source`
 * (Requirement 10.6).
 *
 * `newId` is a {@link CardId}, so the compiler guarantees the copy's realm is
 * `'card'` (Requirement 10.4) — no runtime realm check is needed.
 *
 * @param source - the card to copy from.
 * @param newId - identity for the copy.
 * @param pasteAt - timestamp used for both `createdAt` and `lastModifiedAt`.
 */
export function copyCard(source: Card, newId: CardId, pasteAt: Timestamp): Card {
  return Card.create({
    id: newId,
    name: source.name,
    createdAt: pasteAt,
    ...(source.description !== undefined
      ? { description: source.description }
      : {}),
    ...(source.category !== undefined ? { category: source.category } : {}),
    ...(source.dueDate !== undefined ? { dueDate: source.dueDate } : {}),
  });
}
