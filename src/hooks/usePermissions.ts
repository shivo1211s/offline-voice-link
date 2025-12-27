import { useState, useCallback } from 'react';

export type PermissionType = 'microphone' | 'notification' | 'camera' | 'storage';

export interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  notification: 'granted' | 'denied' | 'prompt' | 'unknown';
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
  storage: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    microphone: 'unknown',
    notification: 'unknown',
    camera: 'unknown',
    storage: 'unknown',
  });

  // Check microphone permission
  const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      // For web browsers
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      return true;
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        setPermissions(prev => ({ ...prev, microphone: 'denied' }));
        return false;
      }
      setPermissions(prev => ({ ...prev, microphone: 'prompt' }));
      return false;
    }
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[usePermissions] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('[usePermissions] ✓ Microphone permission granted');
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      return true;
    } catch (error: any) {
      console.error('[usePermissions] Microphone permission denied:', error?.name);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));
      return false;
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!('Notification' in window)) {
        console.log('[usePermissions] Notifications not supported');
        setPermissions(prev => ({ ...prev, notification: 'unknown' }));
        return false;
      }

      if (Notification.permission === 'granted') {
        setPermissions(prev => ({ ...prev, notification: 'granted' }));
        return true;
      }

      if (Notification.permission !== 'denied') {
        console.log('[usePermissions] Requesting notification permission...');
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          console.log('[usePermissions] ✓ Notification permission granted');
          setPermissions(prev => ({ ...prev, notification: 'granted' }));
          return true;
        }
      }

      setPermissions(prev => ({ ...prev, notification: 'denied' }));
      return false;
    } catch (error) {
      console.error('[usePermissions] Notification permission error:', error);
      setPermissions(prev => ({ ...prev, notification: 'unknown' }));
      return false;
    }
  }, []);

  // Check all permissions
  const checkAllPermissions = useCallback(async () => {
    console.log('[usePermissions] Checking all permissions...');
    await checkMicrophonePermission();
    await requestNotificationPermission();
  }, [checkMicrophonePermission, requestNotificationPermission]);

  return {
    permissions,
    requestMicrophonePermission,
    requestNotificationPermission,
    checkAllPermissions,
    checkMicrophonePermission,
  };
};
