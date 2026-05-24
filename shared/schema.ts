
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  odooUrl: text("odoo_url").notNull(),
  odooDb: text("odoo_db").notNull(),
  odooUsername: text("odoo_username").notNull(),
  odooPassword: text("odoo_password").notNull(),
  responseStyle: text("response_style").notNull().default("detailed"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
