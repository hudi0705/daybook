import { mysqlTable, serial, timestamp, text, varchar, date, json, boolean, index, int, unique, mysqlEnum } from "drizzle-orm/mysql-core"

export const healthCheck = mysqlTable("health_check", {
	id: serial().primaryKey(),
	updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// 用户表
export const users = mysqlTable(
	"users",
	{
		id: serial().primaryKey(),
		username: varchar("username", { length: 50 }).unique(),
		email: varchar("email", { length: 100 }).unique(),
		password_hash: varchar("password_hash", { length: 255 }),
		wechat_openid: varchar("wechat_openid", { length: 100 }).unique(),
		wechat_unionid: varchar("wechat_unionid", { length: 100 }),
		display_name: varchar("display_name", { length: 50 }),
		avatar_url: varchar("avatar_url", { length: 255 }),
		login_type: mysqlEnum("login_type", ["email", "wechat"]).default("email").notNull(),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
	},
	(table) => [
		index("users_email_idx").on(table.email),
		index("users_wechat_openid_idx").on(table.wechat_openid),
	]
);

// AI 配置表
export const aiConfigs = mysqlTable(
	"ai_configs",
	{
		id: serial().primaryKey(),
		user_id: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
		base_url: varchar("base_url", { length: 255 }),
		api_key: varchar("api_key", { length: 255 }),
		model_id: varchar("model_id", { length: 100 }),
		model_name: varchar("model_name", { length: 100 }),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
	}
);

// 日报表
export const dailyReports = mysqlTable(
	"daily_reports",
	{
		id: serial().primaryKey(),
		user_id: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		date: date("date").notNull(),
		title: varchar("title", { length: 200 }).notNull(),
		content: text("content").notNull(),
		mood: varchar("mood", { length: 50 }),
		tags: json("tags"),
		is_published: boolean("is_published").default(true).notNull(),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
	},
	(table) => [
		index("daily_reports_user_id_idx").on(table.user_id),
		index("daily_reports_date_idx").on(table.date),
		index("daily_reports_created_at_idx").on(table.created_at),
		unique("daily_reports_user_date_unique").on(table.user_id, table.date),
	]
);

// 周报表
export const weeklyReports = mysqlTable(
	"weekly_reports",
	{
		id: serial().primaryKey(),
		user_id: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		week_start_date: date("week_start_date").notNull(),
		week_end_date: date("week_end_date").notNull(),
		summary: text("summary").notNull(),
		is_published: boolean("is_published").default(true).notNull(),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
	},
	(table) => [
		index("weekly_reports_user_id_idx").on(table.user_id),
		index("weekly_reports_week_start_date_idx").on(table.week_start_date),
		index("weekly_reports_created_at_idx").on(table.created_at),
	]
);

// 分类
export const categories = mysqlTable(
	"categories",
	{
		id: serial().primaryKey(),
		name: varchar("name", { length: 100 }).notNull().unique(),
		icon: varchar("icon", { length: 50 }),
		sort_order: int("sort_order").default(0).notNull(),
		created_at: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("categories_sort_order_idx").on(table.sort_order),
	]
);

// 标签
export const tags = mysqlTable(
	"tags",
	{
		id: serial().primaryKey(),
		name: varchar("name", { length: 50 }).notNull().unique(),
		color: varchar("color", { length: 20 }),
		created_at: timestamp("created_at").defaultNow().notNull(),
	}
);

// 笔记
export const notes = mysqlTable(
	"notes",
	{
		id: serial().primaryKey(),
		user_id: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 200 }).notNull(),
		content: text("content").notNull(),
		category_id: int("category_id").references(() => categories.id, { onDelete: "set null" }),
		is_pinned: boolean("is_pinned").default(false).notNull(),
		is_archived: boolean("is_archived").default(false).notNull(),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
	},
	(table) => [
		index("notes_user_id_idx").on(table.user_id),
		index("notes_category_id_idx").on(table.category_id),
		index("notes_is_pinned_idx").on(table.is_pinned),
		index("notes_is_archived_idx").on(table.is_archived),
		index("notes_created_at_idx").on(table.created_at),
	]
);

// 笔记-标签关联表
export const noteTags = mysqlTable(
	"note_tags",
	{
		note_id: int("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
		tag_id: int("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
	},
	(table) => [
		unique("note_tags_note_id_tag_id_key").on(table.note_id, table.tag_id),
	]
);
