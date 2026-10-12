import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionForm from '../../src/pages/SessionForm';
import api from '../../src/services/api';
import { deferred, renderPage, response, session, signIn, teacher } from '../helpers';

describe('Session form', (): void => {
  beforeEach((): void => { signIn(true); vi.spyOn(console, 'error').mockImplementation((): void => {}); });
  const show = (edit = false) => renderPage(<SessionForm />, edit ? '/form/:id' : '/form', edit ? '/form/1' : '/form');
  function fill(container: HTMLElement): void {
    // Change real inputs: React builds the payload, including the numeric teacher ID.
    for (const [name, value] of Object.entries({ name: 'Evening yoga', date: '2026-10-20', description: 'Gentle practice', teacherId: '1' })) {
      fireEvent.change(container.querySelector(`[name="${name}"]`)!, { target: { value } });
    }
  }

  it.each([false, true])('saves a session (edit: %s)', async (edit): Promise<void> => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => response(url === '/teacher' ? [teacher] : session));
    const write = vi.spyOn(api, edit ? 'put' : 'post').mockResolvedValue(response(session));
    const { container } = show(edit);
    await screen.findByRole('option', { name: 'Yoga Teacher' });
    if (edit) expect(await screen.findByDisplayValue(session.name)).toBeInTheDocument();
    fill(container); fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Sessions destination')).toBeInTheDocument();
    expect(write).toHaveBeenCalledWith(edit ? '/session/1' : '/session', { name: 'Evening yoga', date: '2026-10-20', description: 'Gentle practice', teacherId: 1 }, expect.anything());
  });

  it('requires a selected teacher before sending a request', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockResolvedValue(response([teacher])); const post = vi.spyOn(api, 'post');
    const { container } = show(); await screen.findByRole('option', { name: 'Yoga Teacher' });
    fireEvent.change(container.querySelector('select')!, { target: { value: '1' } });
    fireEvent.change(container.querySelector('select')!, { target: { value: '' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByText('Please select a teacher')).toBeInTheDocument(); expect(post).not.toHaveBeenCalled();
  });

  it('shows a save error and allows another submission', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockResolvedValue(response([teacher])); vi.spyOn(api, 'post').mockRejectedValue(new Error('Offline'));
    const { container } = show(); await screen.findByRole('option', { name: 'Yoga Teacher' }); fill(container);
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Failed to save session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Session' })).toBeEnabled();
  });

  it('disables saving until the request completes', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockResolvedValue(response([teacher])); const pending = deferred<ReturnType<typeof response<typeof session>>>();
    vi.spyOn(api, 'post').mockReturnValue(pending.promise);
    const { container } = show(); await screen.findByRole('option', { name: 'Yoga Teacher' }); fill(container); fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    await act(async (): Promise<void> => { pending.resolve(response(session)); });
  });

  it('returns to the list on cancel', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockResolvedValue(response([teacher])); show(); fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Sessions destination')).toBeInTheDocument();
  });

  it('redirects a non-admin without loading teachers', async (): Promise<void> => {
    signIn(); const get = vi.spyOn(api, 'get'); show();
    expect(await screen.findByText('Sessions destination')).toBeInTheDocument(); expect(get).not.toHaveBeenCalled();
  });

  it('keeps the form usable when teachers cannot be loaded', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Offline')); show();
    await act(async (): Promise<void> => {});
    expect(screen.getByRole('option', { name: 'Select a teacher' })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('reports a missing session in edit mode', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => { if (url === '/teacher') return response([teacher]); throw new Error('Missing'); }); show(true);
    expect(await screen.findByText('Failed to load session')).toBeInTheDocument();
  });

  it.each(['resolve', 'reject'] as const)('cancels both form requests on unmount (%s)', async (outcome): Promise<void> => {
    const teachers = deferred<ReturnType<typeof response<typeof teacher[]>>>(); const details = deferred<ReturnType<typeof response<typeof session>>>();
    const get = vi.spyOn(api, 'get').mockImplementation((url) => url === '/teacher' ? teachers.promise : details.promise);
    const view = show(true); const signals = get.mock.calls.map(call => call[1]?.signal); view.unmount();
    expect(signals).toHaveLength(2); expect(signals.every(signal => signal?.aborted)).toBe(true);
    await act(async (): Promise<void> => { if (outcome === 'resolve') { teachers.resolve(response([teacher])); details.resolve(response(session)); } else { teachers.reject(new Error('Cancelled')); details.reject(new Error('Cancelled')); } });
    expect(console.error).not.toHaveBeenCalled();
  });
});
