/**
 * Public barrel for the domain layer.
 *
 * Re-exports every public value object, entity, domain operation, and the
 * `Result` utility so consumers (the application layer) can import from a
 * single module (`src/domain`) rather than reaching into individual files
 * (Requirements 11.1, 11.2, 11.3). The domain layer remains pure — this file
 * introduces no runtime dependencies.
 */

export {
  EntityIdBase,
  CardId,
  ColumnId,
  BoardId,
  makeCardId,
  makeColumnId,
  makeBoardId,
} from './EntityId';
export type { Realm } from './EntityId';
export { CardName } from './CardName';
export { ColumnName } from './ColumnName';
export { BoardName } from './BoardName';
export { CardDescription } from './CardDescription';
export { BoardDescription } from './BoardDescription';
export { CardCategory } from './CardCategory';
export { DueDate } from './DueDate';
export { Timestamp } from './Timestamp';
export { Card } from './Card';
export { Column } from './Column';
export { Board } from './Board';
export { copyCard } from './copyCard';
export { ok, err } from './Result';
export type { Result } from './Result';
