import { useState, useEffect, useCallback } from 'react';
import { LocalProfile } from '@/types/p2p';
import { getProfile, saveProfile, deleteProfile } from '@/lib/storage';

export function useLocalProfile() {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await getProfile();
      setProfile(savedProfile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = useCallback(async (username: string) => {
    const newProfile: LocalProfile = {
      id: crypto.randomUUID(),
      username: username.trim(),
    };
    
    await saveProfile(newProfile);
    setProfile(newProfile);
    return newProfile;
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    if (!profile) return;
    
    const updatedProfile = { ...profile, username: username.trim() };
    await saveProfile(updatedProfile);
    setProfile(updatedProfile);
  }, [profile]);

  const logout = useCallback(async () => {
    await deleteProfile();
    setProfile(null);
  }, []);

  return {
    profile,
    loading,
    createProfile,
    updateUsername,
    logout,
  };
}
