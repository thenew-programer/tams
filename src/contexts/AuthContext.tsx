import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { ValidationError } from '../services/apiService';
import { WelcomePage } from '../components/welcome/WelcomePage';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  department: string;
  phone?: string;
  lastLogin?: Date;
  // Add backend compatibility
  username?: string;
  full_name?: string;
  created_at?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Transform Supabase user to frontend format
const transformSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.full_name || '',
    role: supabaseUser.user_metadata?.role || '',
    department: supabaseUser.user_metadata?.department || '',
    phone: supabaseUser.user_metadata?.phone || '',
    lastLogin: supabaseUser.last_sign_in_at ? new Date(supabaseUser.last_sign_in_at) : undefined,
    username: supabaseUser.user_metadata?.username,
    full_name: supabaseUser.user_metadata?.full_name,
    created_at: supabaseUser.created_at,
    last_login: supabaseUser.last_sign_in_at,
    avatar: supabaseUser.user_metadata?.avatar_url,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      setUser(transformSupabaseUser(data.session?.user ?? null));
      setIsLoading(false);
    });
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(transformSupabaseUser(session?.user ?? null));
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        toast.error('Données de connexion invalides');
        setIsLoading(false);
        return false;
      }
      setUser(transformSupabaseUser(data.user));
      setIsLoading(false);
      return true;
    } catch (error) {
      toast.error('Erreur de connexion.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    try {
      const updates: { data: any } = { data: {} };
      if (data.name) updates.data.full_name = data.name;
      if (data.email) updates.data.email = data.email;
      if (data.department) updates.data.department = data.department;
      if (data.phone) updates.data.phone = data.phone;
      if (data.avatar) updates.data.avatar_url = data.avatar;
      const { data: updatedUser, error } = await supabase.auth.updateUser(updates);
      if (error || !updatedUser?.user) {
        toast.error('Données invalides');
        setIsLoading(false);
        return false;
      }
      setUser(transformSupabaseUser(updatedUser.user));
      setIsLoading(false);
      return true;
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil.');
      setIsLoading(false);
      return false;
    }
  };

  const value = {
    user,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!user && !isLoading ? (
        <WelcomePage onLogin={(credentials) => login(credentials.email, credentials.password)} />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};