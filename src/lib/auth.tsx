import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Organization } from '@/lib/types';

type UserRole = 'host' | 'staff' | null;

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  org: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOrg: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUserData(u: User) {
    try {
      const { data: members } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', u.id);

      if (members && members.length > 0) {
        setRole(members[0].role as UserRole);
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', members[0].org_id)
          .single();
        if (orgData) setOrg(orgData as Organization);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (!active) return;
        try {
          if (session?.user) {
            setUser(session.user);
            await loadUserData(session.user);
          } else {
            setUser(null);
            setRole(null);
            setOrg(null);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
          setUser(null);
          setRole(null);
          setOrg(null);
        }
        setLoading(false);
      })();
    });

    // Check initial session
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active && data.session?.user) {
          setUser(data.session.user);
          await loadUserData(data.session.user);
        }
      } catch (err) {
        console.error('Session load error:', err);
      }
      if (active) setLoading(false);
    })();

    return () => { active = false; };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setOrg(null);
  }

  async function refreshOrg() {
    if (!user) return;
    await loadUserData(user);
  }

  return (
    <AuthContext.Provider value={{ user, role, org, loading, signIn, signUp, signOut, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  );
}
