import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Login from '../../src/pages/Login';
import Register from '../../src/pages/Register';
import api from '../../src/services/api';
import { account, deferred, renderPage, response } from '../helpers';

describe('Authentication forms', (): void => {
  // Mock only HTTP: the form, authentication service, storage and router work together.
  it('logs in, stores the session and redirects', async (): Promise<void> => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(response(account));
    const { container } = renderPage(<Login />, '/login');
    fireEvent.change(container.querySelector('input[type="email"]')!, { target: { value: account.email } });
    fireEvent.change(container.querySelector('input[type="password"]')!, { target: { value: 'Password!123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Sessions destination')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/auth/login', { email: account.email, password: 'Password!123' });
    expect(localStorage.getItem('token')).toBe(account.token);
  });

  it('shows login failure and enables retry', async (): Promise<void> => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('Network failure'));
    const { container } = renderPage(<Login />, '/login');
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Login failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('disables login while the request is pending', async (): Promise<void> => {
    const pending = deferred<ReturnType<typeof response<typeof account>>>();
    vi.spyOn(api, 'post').mockReturnValue(pending.promise);
    const { container } = renderPage(<Login />, '/login');
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    await act(async (): Promise<void> => { pending.resolve(response(account)); });
    expect(screen.getByText('Sessions destination')).toBeInTheDocument();
  });

  it('requires email and password before a browser submission', (): void => {
    const { container } = renderPage(<Login />, '/login');
    expect(container.querySelector('input[type="email"]')).toBeRequired();
    expect(container.querySelector('input[type="password"]')).toBeRequired();
    expect(container.querySelector('form')!.checkValidity()).toBe(false);
    expect(screen.getByRole('link', { name: 'Register here' })).toHaveAttribute('href', '/register');
  });

  it('registers with all four fields and stores the session', async (): Promise<void> => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(response(account));
    const { container } = renderPage(<Register />, '/register');
    const values = { firstName: 'Test', lastName: 'User', email: account.email, password: 'Password!123' };
    for (const [name, value] of Object.entries(values)) fireEvent.change(container.querySelector(`[name="${name}"]`)!, { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(await screen.findByText('Sessions destination')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/auth/register', values);
    expect(localStorage.getItem('user')).toBe(JSON.stringify(account));
  });

  it('shows registration failure and releases the loading state', async (): Promise<void> => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('Network failure'));
    const { container } = renderPage(<Register />, '/register');
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Registration failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
  });

  it('requires the registration fields and an eight-character password', (): void => {
    const { container } = renderPage(<Register />, '/register');
    expect(container.querySelectorAll('input[required]')).toHaveLength(4);
    expect(container.querySelector('input[name="password"]')).toHaveAttribute('minlength', '8');
    expect(screen.getByRole('link', { name: 'Login here' })).toHaveAttribute('href', '/login');
  });
});
