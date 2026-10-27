import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const challengeStates = sqliteTable("challenge_states", {
  userId: text("user_id").primaryKey(),
  state: text("state").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
