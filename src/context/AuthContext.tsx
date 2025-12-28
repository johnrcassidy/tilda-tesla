import { createContext, useContext, useState, ReactNode } from 'react';
import { AuthState, LoginCredentials } from '../types';

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
    // TODO: Implement actual authentication logic
    // For now, accept any credentials
    if (credentials.email && credentials.password && credentials.mfaCode.length >= 6) {
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

