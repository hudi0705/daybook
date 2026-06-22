'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  ApiResponse,
} from '@/types/note';

interface UseNotesOptions {
  defaultParams?: Record<string, string>;
  autoFetch?: boolean;
}

interface UseNotesReturn {
  notes: Note[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createNote: (data: CreateNoteRequest) => Promise<Note | null>;
  deleteNote: (id: number) => Promise<boolean>;
}

export function useNotes(options: UseNotesOptions = {}): UseNotesReturn {
  const { defaultParams = {}, autoFetch = true } = options;

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchNotes = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams(defaultParams);
      const response = await fetch(`/api/notes?${searchParams.toString()}`, {
        signal: controller.signal,
      });
      const result: ApiResponse<Note[]> = await response.json();

      if (!controller.signal.aborted) {
        if (result.success && result.data) {
          setNotes(result.data);
        } else {
          setError(result.error || '获取笔记列表失败');
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [JSON.stringify(defaultParams)]);

  const refresh = useCallback(async () => {
    await fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(
    async (data: CreateNoteRequest): Promise<Note | null> => {
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result: ApiResponse<Note> = await response.json();

        if (result.success && result.data) {
          await fetchNotes();
          return result.data;
        }

        setError(result.error || '创建笔记失败');
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : '网络错误');
        return null;
      }
    },
    [fetchNotes]
  );

  const deleteNote = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const response = await fetch(`/api/notes?id=${id}`, {
          method: 'DELETE',
        });
        const result: ApiResponse<unknown> = await response.json();

        if (result.success) {
          await fetchNotes();
          return true;
        }

        setError(result.error || '删除笔记失败');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : '网络错误');
        return false;
      }
    },
    [fetchNotes]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchNotes();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [autoFetch, fetchNotes]);

  return {
    notes,
    loading,
    error,
    refresh,
    createNote,
    deleteNote,
  };
}

interface UseNoteOptions {
  id: number | null;
}

interface UseNoteReturn {
  note: Note | null;
  loading: boolean;
  error: string | null;
  update: (data: UpdateNoteRequest) => Promise<boolean>;
  remove: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useNote({ id }: UseNoteOptions): UseNoteReturn {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchNote = useCallback(async () => {
    if (id === null) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notes?id=${id}`, {
        signal: controller.signal,
      });
      const result: ApiResponse<Note> = await response.json();

      if (!controller.signal.aborted) {
        if (result.success && result.data) {
          setNote(result.data);
        } else {
          setError(result.error || '获取笔记失败');
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [id]);

  const update = useCallback(
    async (data: UpdateNoteRequest): Promise<boolean> => {
      try {
        const response = await fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result: ApiResponse<Note> = await response.json();

        if (result.success && result.data) {
          setNote(result.data);
          return true;
        }

        setError(result.error || '更新笔记失败');
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : '网络错误');
        return false;
      }
    },
    []
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (id === null) return false;

    try {
      const response = await fetch(`/api/notes?id=${id}`, {
        method: 'DELETE',
      });
      const result: ApiResponse<unknown> = await response.json();

      if (result.success) {
        setNote(null);
        return true;
      }

      setError(result.error || '删除笔记失败');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
      return false;
    }
  }, [id]);

  const refresh = useCallback(async () => {
    await fetchNote();
  }, [fetchNote]);

  useEffect(() => {
    fetchNote();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchNote]);

  return { note, loading, error, update, remove, refresh };
}
