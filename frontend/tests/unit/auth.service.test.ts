import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../src/services/api';
import { authService } from '../../src/services/auth.service';
import type { AuthResponse } from '../../src/types';

// Replace only the HTTP client: storage and service logic remain real.
vi.mock('../../src/services/api', () => ({ default: { post: vi.fn() } }));
const account: AuthResponse = {
  id: 1, email: 'user@example.test', firstName: 'Test', lastName: 'User',
  admin: false, token: 'test-token',
};

describe('Authentication service', (): void => {
  beforeEach((): void => { vi.mocked(api.post).mockReset(); });

  it.each(['login', 'register'] as const)('%s saves the returned session', async (method): Promise<void> => {
    vi.mocked(api.post).mockResolvedValue({ data: account });
    const input = { email: account.email, password: 'Password!123', firstName: 'Test', lastName: 'User' };
    expect(await authService[method](input)).toEqual(account);
    expect(api.post).toHaveBeenCalledWith(`/auth/${method}`, input);
    expect(authService.getToken()).toBe(account.token);
    expect(authService.getCurrentUser()).toEqual(account);
    expect(authService.isAuthenticated()).toBe(true);
  });

  it.each(['login', 'register'] as const)('%s does not store a response without a token', async (method): Promise<void> => {
    vi.mocked(api.post).mockResolvedValue({ data: { ...account, token: '' } });
    await authService[method]({ email: account.email, password: 'Password!123', firstName: 'Test', lastName: 'User' });
    expect(authService.getToken()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
  });

  it.each(['login', 'register'] as const)('%s propagates an HTTP failure', async (method): Promise<void> => {
    const failure = new Error('Network unavailable');
    vi.mocked(api.post).mockRejectedValue(failure);
    await expect(authService[method]({ email: account.email, password: 'Password!123', firstName: 'Test', lastName: 'User' })).rejects.toBe(failure);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('returns an empty session when storage is empty', (): void => {
    expect(authService.getCurrentUser()).toBeNull();
    expect(authService.getToken()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('updates the current user while keeping the other fields', (): void => {
    localStorage.setItem('user', JSON.stringify(account));
    expect(authService.updateCurrentUser({ admin: true })).toEqual({ ...account, admin: true });
    expect(authService.getCurrentUser()?.admin).toBe(true);
  });

  it('does not create a user when updating an empty session', (): void => {
    expect(authService.updateCurrentUser({ admin: true })).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('removes only authentication data on logout', (): void => {
    localStorage.setItem('token', account.token);
    localStorage.setItem('user', JSON.stringify(account));
    localStorage.setItem('preference', 'light');
    authService.logout();
    expect(authService.getToken()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('preference')).toBe('light');
  });
});
