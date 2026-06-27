import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  paginatedResponse,
} from '../../utils/response.js';

export const notesRouter = Router();

notesRouter.use(authMiddleware);

interface Note {
  id: number;
  userId: number;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const notes: Map<number, Note> = new Map();
let nextId = 1;

/**
 * GET /api/notes
 * List notes with pagination, search, and filters
 */
notesRouter.get('/', (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const category = req.query.category as string | undefined;
  const search = (req.query.search as string)?.toLowerCase();
  const pinned = req.query.pinned as string | undefined;

  let userNotes = Array.from(notes.values())
    .filter((n) => n.userId === userId)
    .sort((a, b) => {
      // Pinned notes first, then by updatedAt
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  if (category) {
    userNotes = userNotes.filter((n) => n.category === category);
  }
  if (pinned === 'true') {
    userNotes = userNotes.filter((n) => n.isPinned);
  }
  if (search) {
    userNotes = userNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(search) ||
        n.content.toLowerCase().includes(search) ||
        n.tags.some((t) => t.toLowerCase().includes(search)),
    );
  }

  const total = userNotes.length;
  const offset = (page - 1) * limit;
  const paged = userNotes.slice(offset, offset + limit);

  paginatedResponse(res, paged, total, page, limit);
});

/**
 * GET /api/notes/categories
 * Get all categories for the current user
 */
notesRouter.get('/categories', (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const userNotes = Array.from(notes.values()).filter((n) => n.userId === userId);
  const categories = [...new Set(userNotes.map((n) => n.category))].sort();

  successResponse(res, { categories });
});

/**
 * GET /api/notes/:id
 * Get a single note
 */
notesRouter.get('/:id', (req: AuthRequest, res: Response): void => {
  const noteId = parseInt(req.params.id, 10);
  const note = notes.get(noteId);

  if (!note || note.userId !== req.user!.id) {
    notFoundResponse(res, 'Note');
    return;
  }

  successResponse(res, note);
});

/**
 * POST /api/notes
 * Create a new note
 */
notesRouter.post('/', (req: AuthRequest, res: Response): void => {
  const { title, content, category, isPinned, tags } = req.body;

  if (!title || !content) {
    errorResponse(res, 'Title and content are required');
    return;
  }

  const id = nextId++;
  const now = new Date().toISOString();
  const note: Note = {
    id,
    userId: req.user!.id,
    title,
    content,
    category: category || 'general',
    isPinned: isPinned || false,
    tags: tags || [],
    createdAt: now,
    updatedAt: now,
  };

  notes.set(id, note);
  createdResponse(res, note, 'Note created');
});

/**
 * PUT /api/notes/:id
 * Update an existing note
 */
notesRouter.put('/:id', (req: AuthRequest, res: Response): void => {
  const noteId = parseInt(req.params.id, 10);
  const existing = notes.get(noteId);

  if (!existing || existing.userId !== req.user!.id) {
    notFoundResponse(res, 'Note');
    return;
  }

  const { title, content, category, isPinned, tags } = req.body;

  const updated: Note = {
    ...existing,
    ...(title !== undefined && { title }),
    ...(content !== undefined && { content }),
    ...(category !== undefined && { category }),
    ...(isPinned !== undefined && { isPinned }),
    ...(tags !== undefined && { tags }),
    updatedAt: new Date().toISOString(),
  };

  notes.set(noteId, updated);
  successResponse(res, updated, 'Note updated');
});

/**
 * PATCH /api/notes/:id/pin
 * Toggle pin status
 */
notesRouter.patch('/:id/pin', (req: AuthRequest, res: Response): void => {
  const noteId = parseInt(req.params.id, 10);
  const existing = notes.get(noteId);

  if (!existing || existing.userId !== req.user!.id) {
    notFoundResponse(res, 'Note');
    return;
  }

  const updated: Note = {
    ...existing,
    isPinned: !existing.isPinned,
    updatedAt: new Date().toISOString(),
  };

  notes.set(noteId, updated);
  successResponse(res, updated, updated.isPinned ? 'Note pinned' : 'Note unpinned');
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
notesRouter.delete('/:id', (req: AuthRequest, res: Response): void => {
  const noteId = parseInt(req.params.id, 10);
  const note = notes.get(noteId);

  if (!note || note.userId !== req.user!.id) {
    notFoundResponse(res, 'Note');
    return;
  }

  notes.delete(noteId);
  successResponse(res, null, 'Note deleted');
});
