import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

let mockAuth = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
};

function renderPrivate(auth: typeof mockAuth) {
  mockAuth = auth;
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/dashboard"
          element={(
            <PrivateRoute>
              <div>Secret dashboard</div>
            </PrivateRoute>
          )}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('PrivateRoute', () => {
  it('shows a loading state', () => {
    renderPrivate({ isAuthenticated: false, isLoading: true, user: null });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    renderPrivate({ isAuthenticated: false, isLoading: false, user: null });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    renderPrivate({ isAuthenticated: true, isLoading: false, user: null });
    expect(screen.getByText('Secret dashboard')).toBeInTheDocument();
  });
});
