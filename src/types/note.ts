// 数据库实体类型

export interface Note {
  id: number;
  title: string;
  content: string;
  category_id: number | null;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface NoteTag {
  note_id: number;
  tag_id: number;
}

// API 请求类型

export interface CreateNoteRequest {
  title: string;
  content: string;
  category_id?: number;
  tags?: string[];
  is_pinned?: boolean;
}

export interface UpdateNoteRequest {
  id: number;
  title?: string;
  content?: string;
  category_id?: number | null;
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface CreateCategoryRequest {
  name: string;
  icon?: string;
  sort_order?: number;
}

export interface NoteListQuery {
  page?: number;
  page_size?: number;
  category_id?: number;
  tag?: string;
  search?: string;
  is_archived?: boolean;
}

// API 响应类型

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type NoteListResponse = ApiResponse<Note[]>;
export type NoteDetailResponse = ApiResponse<Note>;
export type TagListResponse = ApiResponse<Tag[]>;
export type CategoryListResponse = ApiResponse<Category[]>;

// 前端状态类型

export interface NoteEditorState {
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  isDirty: boolean;
  isSaving: boolean;
}

export interface NoteListState {
  notes: Note[];
  loading: boolean;
  error: string | null;
  page: number;
  total: number;
}

export interface NoteListFilters {
  search: string;
  tag: string | null;
  sort_by: 'created_at' | 'updated_at' | 'title';
  sort_order: 'asc' | 'desc';
}

export interface NoteStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
}
