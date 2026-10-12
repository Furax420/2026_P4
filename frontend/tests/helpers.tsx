import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosHeaders } from 'axios';
import type { AxiosResponse } from 'axios';
import type { AuthResponse, Session, Teacher, UserProfile } from '../src/types';

// Stable fixtures make each test easy to read and independent of real accounts.
export const account: AuthResponse = { id: 1, email: 'user@example.test', firstName: 'Test', lastName: 'User', admin: false, token: 'test-token' };
export const teacher: Teacher = { id: 1, firstName: 'Yoga', lastName: 'Teacher' };
export const session: Session = { id: 1, name: 'Morning yoga', date: '2026-10-12T00:00:00.000Z', description: 'A relaxing session', teacher, users: [] };
export const profile: UserProfile = { ...account, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

export function signIn(admin = false): void {
  localStorage.setItem('token', account.token);
  localStorage.setItem('user', JSON.stringify({ ...account, admin }));
}

export function response<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } };
}

// A real router observes redirects while simple destination pages avoid unrelated requests.
export function renderPage(page: ReactElement, path: string, initialPath = path) {
  return render(<MemoryRouter initialEntries={[initialPath]}><Routes>
    <Route path={path} element={page} />
    {path !== '/sessions' && <Route path="/sessions" element={<h1>Sessions destination</h1>} />}
    {path !== '/login' && <Route path="/login" element={<h1>Login destination</h1>} />}
    <Route path="/sessions/edit/:id" element={<h1>Edit destination</h1>} />
  </Routes></MemoryRouter>);
}

// Control when a request finishes to exercise loading and effect cleanup.
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
