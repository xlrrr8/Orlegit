"use client";

import { createContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  trust_score: number;
  role: "user" | "moderator" | "admin";
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
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (error || !data) {
          const emailPrefix = currentUser.email ? currentUser.email.split("@")[0] : "user";
          const meta = currentUser.user_metadata;
          const fallbackUsername = meta?.username || meta?.full_name || meta?.name || emailPrefix;

          const baseProfile = {
            id: currentUser.id,
            username: fallbackUsername,
            avatar_url: meta?.avatar_url || null,
            trust_score: 100,
          };

          // First attempt: insert with role
          let { data: insertedData, error: insertError } = await supabase
            .from("profiles")
            .insert({ ...baseProfile, role: "user" })
            .select()
            .single();

          // Second attempt: if failed (e.g. role column missing in DB or username conflict), try without role or with unique username
          if (insertError) {
            const uniqueUsername = `${fallbackUsername}_${Math.floor(Math.random() * 1000)}`;
            
            // Try without role field (in case migration 003 hasn't been run yet)
            const { data: noRoleData, error: noRoleError } = await supabase
              .from("profiles")
              .insert({ ...baseProfile, username: uniqueUsername })
              .select()
              .single();

            if (!noRoleError && noRoleData) {
              insertedData = noRoleData;
              insertError = null;
            }
          }

          if (!insertError && insertedData) {
            setProfile({ role: "user", ...insertedData } as Profile);
          } else {
            setProfile({
              id: currentUser.id,
              username: fallbackUsername,
              avatar_url: meta?.avatar_url || null,
              trust_score: 100,
              role: "user",
              created_at: new Date().toISOString(),
            } as Profile);
          }
        } else {
          setProfile({ role: "user", ...data } as Profile);
        }
      } catch {
        setProfile({
          id: currentUser.id,
          username: currentUser.email ? currentUser.email.split("@")[0] : "user",
          avatar_url: null,
          trust_score: 100,
          role: "user",
          created_at: new Date().toISOString(),
        } as Profile);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const res = await supabase.auth.getSession();
        const currentUser = res.data.session?.user ?? null;
        if (currentUser && mounted) {
          setUser(currentUser);
          await fetchProfile(currentUser);
        } else if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error("Supabase session check error:", e);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      const currentUser = session?.user ?? null;
      if (currentUser) {
        setUser(currentUser);
        fetchProfile(currentUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, supabase.auth]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(null);
  }, [supabase.auth]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
