import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  AuthUser,
} from 'aws-amplify/auth';
import { isAmplifyConfigured } from '@/config/amplify';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** JWT id token for API Authorization header */
  idToken: string | null;
  /** True when Cognito env vars are present and Amplify.configure() was called */
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configured = isAmplifyConfigured();

  const refreshSession = useCallback(async () => {
    if (!configured) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() ?? null;
      setIdToken(token);
    } catch {
      setIdToken(null);
    }
  }, [configured]);

  useEffect(() => {
    // If Amplify is not configured (no CDK deploy yet), skip all auth calls
    // and immediately mark loading as done so the app renders normally.
    if (!configured) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        await refreshSession();
      } catch {
        // Not signed in — this is the normal unauthenticated path
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [configured, refreshSession]);

  const login = async (email: string, password: string) => {
    if (!configured) throw new Error('Cognito is not configured. Deploy the CDK stack first.');
    const result = await signIn({ username: email, password });
    if (result.isSignedIn) {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      await refreshSession();
    }
  };

  const logout = async () => {
    if (!configured) return;
    await signOut();
    setUser(null);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        idToken,
        isConfigured: configured,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
