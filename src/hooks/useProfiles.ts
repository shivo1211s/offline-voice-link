import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/chat';

export function useProfiles(currentProfileId: string | null) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();

    // Subscribe to profile changes for online status
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          const updatedProfile = payload.new as Profile;
          setProfiles((prev) =>
            prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('username', { ascending: true });

    if (!error && data) {
      // Filter out current user
      setProfiles(
        (data as Profile[]).filter((p) => p.id !== currentProfileId)
      );
    }
    setLoading(false);
  };

  return {
    profiles,
    loading,
    refetch: fetchProfiles
  };
}
