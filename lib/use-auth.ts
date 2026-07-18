'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url?: string | null;
  cover_color?: string;
  cover_gradient?: string;
  cover_url?: string | null;
  bio: string;
  is_creator: boolean;
  subscription_price: number;
  verified: boolean;
  subscriber_count: number;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始获取 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 监听变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const signUp = async (email: string, password: string, username: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName }
      }
    });
    if (error) return { error };
    if (data.user) await fetchProfile(data.user.id);
    return { data, error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.user) await fetchProfile(data.user.id);
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not logged in') };
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (!error) await fetchProfile(user.id);
    return { error };
  };

  return { user, profile, loading, signUp, signIn, signOut, updateProfile };
}
