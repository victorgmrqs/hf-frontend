import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { ReactNode } from 'react';
import { UserProvider, useUser } from './useUser';
import { server } from '../test/msw/server';

const wrapper = ({ children }: { children: ReactNode }) => <UserProvider>{children}</UserProvider>;

const users = [
  { id: 'u1', name: 'Ana', email: 'ana@hf.com' },
  { id: 'u2', name: 'Bia', email: 'bia@hf.com' },
];

function usersOk() {
  return http.get('*/users', () => HttpResponse.json({ data: users, error: null }));
}

afterEach(() => {
  localStorage.clear();
});

describe('useUser', () => {
  it('carrega usuários e seleciona o primeiro quando não há nada salvo', async () => {
    server.use(usersOk());
    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allUsers).toHaveLength(2);
    expect(result.current.currentUser?.id).toBe('u1');
  });

  it('restaura o usuário salvo no localStorage', async () => {
    localStorage.setItem('hf_current_user', 'u2');
    server.use(usersOk());
    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => expect(result.current.currentUser?.id).toBe('u2'));
  });

  it('faz fallback para o primeiro quando o id salvo não existe', async () => {
    localStorage.setItem('hf_current_user', 'inexistente');
    server.use(usersOk());
    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => expect(result.current.currentUser?.id).toBe('u1'));
  });

  it('setCurrentUser troca o usuário e persiste no localStorage', async () => {
    server.use(usersOk());
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.currentUser?.id).toBe('u1'));

    act(() => result.current.setCurrentUser(users[1]));

    expect(result.current.currentUser?.id).toBe('u2');
    expect(localStorage.getItem('hf_current_user')).toBe('u2');
  });

  it('em erro do envelope, mantém sem usuário e encerra o loading', async () => {
    server.use(
      http.get('*/users', () => HttpResponse.json({ data: null, error: { code: 'USR-500' } }, { status: 500 })),
    );
    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUser).toBeNull();
    expect(result.current.allUsers).toEqual([]);
  });

  it('lança se usado fora do UserProvider', () => {
    expect(() => renderHook(() => useUser())).toThrow(/useUser must be used within a UserProvider/);
  });
});
