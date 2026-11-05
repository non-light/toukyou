import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('ticket_rooms', {
  code: text('code').primaryKey(),
  stage: integer('stage').notNull().default(0),
  delivered: integer('delivered').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const members = sqliteTable('ticket_members', {
  id: text('id').primaryKey(),
  roomCode: text('room_code').notNull().references(() => rooms.code, {onDelete: 'cascade'}),
  tokenHash: text('token_hash').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  position: text('position').notNull(),
  lastSeen: integer('last_seen').notNull(),
}, table => [
  uniqueIndex('ticket_members_token').on(table.tokenHash),
  index('ticket_members_room').on(table.roomCode, table.lastSeen),
]);
