import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';
import { createApolice, deleteApolice, listApolices, updateApolice } from '../api/apolice';
import type { ApoliceFormData, ApoliceRecord } from '../types/apolice';

export type UseApolicesState = {
  apolices: ApoliceRecord[];
  loading: boolean;
  error: string | null;
};

export type UseApolicesActions = {
  refresh: () => Promise<ApoliceRecord[]>;
  create: (payload: ApoliceFormData) => Promise<ApoliceRecord>;
  update: (luc: string, payload: ApoliceFormData) => Promise<ApoliceRecord>;
  remove: (luc: string) => Promise<{ message: string }>;
  clearError: () => void;
};

export type UseApolicesResult = UseApolicesState & UseApolicesActions;

export function useApolices(initialApolices: ApoliceRecord[] = []): UseApolicesResult {
  const [apolices, setApolices] = useState<ApoliceRecord[]>(initialApolices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextApolices = await listApolices();
      setApolices(nextApolices);
      return nextApolices;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível carregar as apólices';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: ApoliceFormData) => {
    setLoading(true);
    setError(null);

    try {
      const created = await createApolice(payload);
      setApolices((current) => [...current, created]);
      return created;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível criar a apólice';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (luc: string, payload: ApoliceFormData) => {
    setLoading(true);
    setError(null);

    try {
      const updated = await updateApolice(luc, payload);
      setApolices((current) => current.map((item) => (item.id === luc ? updated : item)));
      return updated;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível atualizar a apólice';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (luc: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await deleteApolice(luc);
      setApolices((current) => current.filter((item) => item.id !== luc));
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível excluir a apólice';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    apolices,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    clearError,
  };
}
