import { pgTable, serial, timestamp, text, varchar, date, jsonb, boolean, index, integer, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 日报表
export const dailyReports = pgTable(
	"daily_reports",
	{
		id: serial().primaryKey(),
		date: date("date").notNull().unique(),
		title: varchar("title", { length: 200 }).notNull(),
		content: text("content").notNull(),
		mood: varchar("mood", { length: 50 }),
		tags: jsonb("tags"),
		is_published: boolean("is_published").default(true).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("daily_reports_date_idx").on(table.date),
		index("daily_reports_created_at_idx").on(table.created_at),
	]
);

// 周报表
export const weeklyReports = pgTable(
	"weekly_reports",
	{
		id: serial().primaryKey(),
		week_start_date: date("week_start_date").notNull(),
		week_end_date: date("week_end_date").notNull(),
		summary: text("summary").notNull(),
		is_published: boolean("is_published").default(true).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("weekly_reports_week_start_date_idx").on(table.week_start_date),
		index("weekly_reports_created_at_idx").on(table.created_at),
	]
);

// 分类
export const categories = pgTable(
	"categories",
	{
		id: serial().primaryKey(),
		name: varchar("name", { length: 100 }).notNull().unique(),
		icon: varchar("icon", { length: 50 }),
		sort_order: integer("sort_order").default(0).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("categories_sort_order_idx").on(table.sort_order),
	]
);

// 标签
export const tags = pgTable(
	"tags",
	{
		id: serial().primaryKey(),
		name: varchar("name", { length: 50 }).notNull().unique(),
		color: varchar("color", { length: 20 }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	}
);

// 笔记
export const notes = pgTable(
	"notes",
	{
		id: serial().primaryKey(),
		title: varchar("title", { length: 200 }).notNull(),
		content: text("content").notNull(),
		category_id: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
		is_pinned: boolean("is_pinned").default(false).notNull(),
		is_archived: boolean("is_archived").default(false).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("notes_category_id_idx").on(table.category_id),
		index("notes_is_pinned_idx").on(table.is_pinned),
		index("notes_is_archived_idx").on(table.is_archived),
		index("notes_created_at_idx").on(table.created_at),
	]
);

// 笔记-标签关联表
export const noteTags = pgTable(
	"note_tags",
	{
		note_id: integer("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
		tag_id: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
	},
	(table) => [
		unique("note_tags_note_id_tag_id_key").on(table.note_id, table.tag_id),
	]
);