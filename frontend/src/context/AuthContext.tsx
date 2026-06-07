import { createContext, useContext } from 'react';
import type { UserProfile } from '../api/types';

interface AuthContextValue {
  user: UserProfile;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthContext.Provider');
  return ctx;
}
