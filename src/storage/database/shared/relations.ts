import { relations } from "drizzle-orm/relations";
import { categories, notes, tags, noteTags } from "./schema";

// 分类关系
export const categoriesRelations = relations(categories, ({ many }) => ({
	notes: many(notes),
}));

// 笔记关系
export const notesRelations = relations(notes, ({ one, many }) => ({
	category: one(categories, {
		fields: [notes.category_id],
		references: [categories.id],
	}),
	noteTags: many(noteTags),
}));

// 标签关系
export const tagsRelations = relations(tags, ({ many }) => ({
	noteTags: many(noteTags),
}));

// 笔记-标签关联关系
export const noteTagsRelations = relations(noteTags, ({ one }) => ({
	note: one(notes, {
		fields: [noteTags.note_id],
		references: [notes.id],
	}),
	tag: one(tags, {
		fields: [noteTags.tag_id],
		references: [tags.id],
	}),
}));
