"use client";

import { createContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  trust_score: number;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(
    async (currentUser: User) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      
      if (error || !data) {
        // Create default profile for OAuth/new users
        const emailPrefix = currentUser.email ? currentUser.email.split("@")[0] : "user";
        const meta = currentUser.user_metadata;
        const fallbackUsername = meta?.full_name || meta?.name || `${emailPrefix}_${Math.random().toString(36).slice(2, 6)}`;
        
        const newProfile = {
          id: currentUser.id,
          username: fallbackUsername,
          avatar_url: meta?.avatar_url || null,
          trust_score: 0,
        };

        const { data: insertedData, error: insertError } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .single();

        if (!insertError && insertedData) {
          setProfile(insertedData as Profile);
        } else {
          setProfile({
            ...newProfile,
            created_at: new Date().toISOString(),
          } as Profile);
        }
      } else {
        setProfile(data as Profile);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then((res: any) => {
      const currentUser = res.data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchProfile(currentUser);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase.auth]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
