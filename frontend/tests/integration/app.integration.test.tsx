import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import api from '../../src/services/api';
import { response, signIn } from '../helpers';

describe('Application navigation', (): void => {
  // Exercise the actual route table rather than a test-only replacement.
  it.each(['/sessions', '/sessions/1', '/sessions/create', '/sessions/edit/1', '/profile'])('protects %s without authentication', async (path): Promise<void> => {
    window.history.pushState({}, '', path);
    const get = vi.spyOn(api, 'get'); render(<App />);
    expect(await screen.findByText('Login to Yoga Studio')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login'); expect(get).not.toHaveBeenCalled();
  });

  it('redirects the root to the authenticated session list', async (): Promise<void> => {
    signIn(); vi.spyOn(api, 'get').mockResolvedValue(response([])); window.history.pushState({}, '', '/'); render(<App />);
    expect(await screen.findByText('No sessions available')).toBeInTheDocument(); expect(window.location.pathname).toBe('/sessions');
  });

  it('shows admin navigation and opens the creation page', async (): Promise<void> => {
    signIn(true); vi.spyOn(api, 'get').mockResolvedValue(response([])); window.history.pushState({}, '', '/sessions'); render(<App />);
    await screen.findByText('No sessions available');
    fireEvent.click(screen.getAllByRole('link', { name: 'Create Session' })[0]);
    expect(await screen.findByText('Create New Session')).toBeInTheDocument(); expect(window.location.pathname).toBe('/sessions/create');
  });
});
