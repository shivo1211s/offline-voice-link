import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mic, Bell, Phone } from 'lucide-react';
import { usePermissions, type PermissionStatus } from '@/hooks/usePermissions';

export function PermissionRequest() {
  const {
    permissions,
    requestMicrophonePermission,
    requestNotificationPermission,
    checkAllPermissions,
  } = usePermissions();
  
  const [showAlert, setShowAlert] = useState(false);
  const [requiredPermissions, setRequiredPermissions] = useState<string[]>([]);

  useEffect(() => {
    // Check permissions on mount
    checkAllPermissions();
  }, [checkAllPermissions]);

  useEffect(() => {
    // Check which permissions are missing
    const missing: string[] = [];
    if (permissions.microphone !== 'granted') {
      missing.push('microphone');
    }
    if (permissions.notification !== 'granted') {
      missing.push('notification');
    }
    
    setRequiredPermissions(missing);
    setShowAlert(missing.length > 0);
  }, [permissions]);

  const handleRequestMicrophone = async () => {
    const granted = await requestMicrophonePermission();
    if (!granted) {
      console.error('[PermissionRequest] Failed to grant microphone permission');
    }
  };

  const handleRequestNotification = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.error('[PermissionRequest] Failed to grant notification permission');
    }
  };

  const handleDismiss = () => {
    setShowAlert(false);
  };

  if (!showAlert || requiredPermissions.length === 0) {
    return null;
  }

  return (
    <Alert className="fixed top-4 left-4 right-4 z-50 bg-blue-50 border-blue-200">
      <AlertDescription className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">Permissions Required</h3>
            <p className="text-sm text-blue-800 mb-3">
              To use calling and messaging features, please grant the following permissions:
            </p>
            
            <div className="space-y-2 mb-3">
              {requiredPermissions.includes('microphone') && (
                <div className="flex items-center justify-between bg-white p-2 rounded">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-700">Microphone</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRequestMicrophone}
                    className="h-7"
                  >
                    Request
                  </Button>
                </div>
              )}
              
              {requiredPermissions.includes('notification') && (
                <div className="flex items-center justify-between bg-white p-2 rounded">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-700">Notifications</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRequestNotification}
                    className="h-7"
                  >
                    Request
                  </Button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 text-blue-900 hover:text-blue-700 text-lg"
          >
            ✕
          </button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
