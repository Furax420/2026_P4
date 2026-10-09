// The repository reports a duplicate; the service chooses the HTTP response.
export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already exists');
    this.name = 'DuplicateEmailError';
  }
}
