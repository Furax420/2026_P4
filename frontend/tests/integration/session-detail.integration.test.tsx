import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionDetail from '../../src/pages/SessionDetail';
import api from '../../src/services/api';
import { deferred, renderPage, response, session, signIn } from '../helpers';

describe('Session details and participation', (): void => {
  beforeEach((): void => { signIn(); vi.spyOn(console, 'error').mockImplementation((): void => {}); });
  const show = () => renderPage(<SessionDetail />, '/sessions/:id', '/sessions/1');

  it('joins and refreshes the participant list', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockResolvedValueOnce(response(session)).mockResolvedValue(response({ ...session, users: [1] }));
    const post = vi.spyOn(api, 'post').mockResolvedValue(response({}));
    show();
    expect(screen.getByText('Loading session...')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Join Session' }));
    expect(await screen.findByRole('button', { name: 'Leave Session' })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/session/1/participate/1', {}, expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  });

  it('leaves and refreshes the participant list', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockResolvedValueOnce(response({ ...session, users: [1] })).mockResolvedValue(response(session));
    const remove = vi.spyOn(api, 'delete').mockResolvedValue(response({}));
    show(); fireEvent.click(await screen.findByRole('button', { name: 'Leave Session' }));
    expect(await screen.findByRole('button', { name: 'Join Session' })).toBeInTheDocument();
    expect(remove).toHaveBeenCalledWith('/session/1/participate/1', expect.anything());
  });

  it.each([false, true])('alerts when participation fails (already joined: %s)', async (joined): Promise<void> => {
    vi.spyOn(api, 'get').mockResolvedValue(response({ ...session, users: joined ? [1] : [] }));
    vi.spyOn(api, joined ? 'delete' : 'post').mockRejectedValue(new Error('Offline'));
    const alert = vi.spyOn(window, 'alert').mockImplementation((): void => {});
    show();
    const button = await screen.findByRole('button', { name: joined ? 'Leave Session' : 'Join Session' });
    await act(async (): Promise<void> => { fireEvent.click(button); });
    expect(alert).toHaveBeenCalledWith(joined ? 'Failed to leave session' : 'Failed to join session');
  });

  it.each(['Edit', 'Back to Sessions'])('navigates using %s', async (button): Promise<void> => {
    signIn(true); vi.spyOn(api, 'get').mockResolvedValue(response(session)); show();
    fireEvent.click(await screen.findByRole('button', { name: button }));
    expect(await screen.findByText(button === 'Edit' ? 'Edit destination' : 'Sessions destination')).toBeInTheDocument();
  });

  it('deletes a session as admin and returns to the list', async (): Promise<void> => {
    signIn(true); vi.spyOn(api, 'get').mockResolvedValue(response(session));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const remove = vi.spyOn(api, 'delete').mockResolvedValue(response({})); show();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Sessions destination')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledWith('/session/1', expect.anything());
  });

  it('does not delete after cancelling the confirmation', async (): Promise<void> => {
    signIn(true); vi.spyOn(api, 'get').mockResolvedValue(response(session));
    vi.spyOn(window, 'confirm').mockReturnValue(false); const remove = vi.spyOn(api, 'delete'); show();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(remove).not.toHaveBeenCalled();
  });

  it('alerts when admin deletion fails', async (): Promise<void> => {
    signIn(true); vi.spyOn(api, 'get').mockResolvedValue(response(session));
    vi.spyOn(window, 'confirm').mockReturnValue(true); vi.spyOn(api, 'delete').mockRejectedValue(new Error('Offline'));
    const alert = vi.spyOn(window, 'alert').mockImplementation((): void => {}); show();
    const button = await screen.findByRole('button', { name: 'Delete' });
    await act(async (): Promise<void> => { fireEvent.click(button); });
    expect(alert).toHaveBeenCalledWith('Failed to delete session');
  });

  it('shows request failures', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Not found')); show();
    expect(await screen.findByText('Failed to load session details')).toBeInTheDocument();
  });

  it('handles an empty session response', async (): Promise<void> => {
    vi.spyOn(api, 'get').mockResolvedValue(response(null)); show();
    expect(await screen.findByText('Session not found')).toBeInTheDocument();
  });

  it('redirects when a token exists without a saved user', async (): Promise<void> => {
    localStorage.removeItem('user'); vi.spyOn(api, 'get').mockResolvedValue(response(session)); show();
    expect(await screen.findByText('Login destination')).toBeInTheDocument();
  });

  it.each(['resolve', 'reject'] as const)('ignores a late detail request after unmount (%s)', async (outcome): Promise<void> => {
    const pending = deferred<ReturnType<typeof response<typeof session>>>();
    const get = vi.spyOn(api, 'get').mockReturnValue(pending.promise); const view = show();
    const signal = get.mock.calls[0][1]?.signal; view.unmount(); expect(signal?.aborted).toBe(true);
    await act(async (): Promise<void> => { if (outcome === 'resolve') pending.resolve(response(session)); else pending.reject(new Error('Cancelled')); });
    expect(console.error).not.toHaveBeenCalled();
  });
});
