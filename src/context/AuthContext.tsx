import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthState, LoginCredentials } from '../types';

interface AuthContextType {
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  setLoginStep: (step: AuthState['loginStep']) => void;
  setEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    email: null,
    loginStep: 'email',
  });

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    // Demo authentication - require valid email format, password (min 8 chars), and 6-digit MFA code
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(credentials.email);
    const isValidPassword = credentials.password && credentials.password.length >= 8;
    const isValidMFA = credentials.mfaCode && /^\d{6}$/.test(credentials.mfaCode);
    
    if (isValidEmail && isValidPassword && isValidMFA) {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAuthState({
        isAuthenticated: true,
        email: credentials.email,
        loginStep: 'email',
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      email: null,
      loginStep: 'email',
    });
  };

  const setLoginStep = (step: AuthState['loginStep']) => {
    setAuthState((prev) => ({ ...prev, loginStep: step }));
  };

  const setEmail = (email: string) => {
    setAuthState((prev) => ({ ...prev, email }));
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        login,
        logout,
        setLoginStep,
        setEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

