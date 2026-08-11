import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import api, { authApi } from '../services/api';
import type { AuthState, AuthResponse, LoginCredentials, RegisterData, ApiResponse, User } from '../types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  loadUser: () => Promise<void>;
  updateProfile: (data: { name: string; email: string; phone?: string; location?: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'accessToken';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    try {
      const response = await api.get<ApiResponse<AuthResponse>>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success && response.data.data) {
        setState({
          user: response.data.data.user,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setState(s => ({ ...s, isLoading: false }));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login failed');
    }
    const { user, accessToken } = response.data;
    localStorage.setItem(STORAGE_KEY, accessToken);
    setState({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Registration failed');
    }
    const { user, accessToken } = response.data;
    localStorage.setItem(STORAGE_KEY, accessToken);
    setState({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API errors
    }
    localStorage.removeItem(STORAGE_KEY);
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const response = await authApi.refresh();
      if (response.success && response.data?.accessToken) {
        localStorage.setItem(STORAGE_KEY, response.data.accessToken);
        setState(s => ({ ...s, accessToken: response.data!.accessToken }));
        return response.data.accessToken;
      }
    } catch {
      // Refresh failed
    }
    localStorage.removeItem(STORAGE_KEY);
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    return null;
  };

  const updateProfile = async (data: { name: string; email: string; phone?: string; location?: string; avatarUrl?: string }) => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) throw new Error('Not authenticated');
    
    const response = await api.put<ApiResponse<{ user: User }>>('/auth/profile', data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const userData = response.data.data?.user;
    if (response.data.success && userData) {
      setState(s => ({ ...s, user: userData }));
    } else {
      throw new Error(response.data.error || 'Failed to update profile');
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshAccessToken, loadUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}