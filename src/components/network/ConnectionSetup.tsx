import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wifi, User, Radio, Loader2 } from 'lucide-react';

interface ConnectionSetupProps {
  onCreateProfile: (username: string) => Promise<any>;
  onGoOnline: () => Promise<void>;
  hasProfile: boolean;
  username?: string;
  myIp?: string;
  isScanning?: boolean;
}

export function ConnectionSetup({
  onCreateProfile,
  onGoOnline,
  hasProfile,
  username,
  myIp,
  isScanning = false,
}: ConnectionSetupProps) {
  const [step, setStep] = useState<'profile' | 'connection'>(hasProfile ? 'connection' : 'profile');
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateProfile = async () => {
    if (!newUsername.trim()) return;
    setLoading(true);
    try {
      await onCreateProfile(newUsername.trim());
      setStep('connection');
    } finally {
      setLoading(false);
    }
  };

  const handleGoOnline = async () => {
    setLoading(true);
    try {
      await onGoOnline();
    } finally {
      setLoading(false);
    }
  };

  if (step === 'profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Welcome
            </h1>
            <p className="text-muted-foreground mt-2">
              Create your profile to start chatting
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Your Name
              </label>
              <Input
                placeholder="Enter your name..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                className="h-12 rounded-xl"
              />
            </div>

            <Button
              onClick={handleCreateProfile}
              disabled={!newUsername.trim() || loading}
              className="w-full h-12 rounded-xl text-lg font-semibold"
            >
              {loading ? 'Creating...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Wifi className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            LAN Chat
          </h1>
          <p className="text-muted-foreground mt-2">
            Hello, <span className="text-primary font-medium">{username}</span>
          </p>
        </div>

        {/* Go Online Button */}
        <div className="p-6 rounded-2xl border border-border bg-card/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Radio className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Go Online</h3>
              <p className="text-sm text-muted-foreground">
                Auto-discover devices on your network
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {myIp && (
              <div className="p-3 rounded-xl bg-secondary/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Your IP Address</p>
                <p className="font-mono text-foreground font-medium">{myIp}</p>
              </div>
            )}

            <Button
              onClick={handleGoOnline}
              disabled={loading || isScanning}
              className="w-full h-12 rounded-xl text-lg font-semibold"
            >
              {loading || isScanning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scanning Network...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Start
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-6 p-4 rounded-xl bg-secondary/30">
          <h4 className="font-medium text-foreground mb-3 text-center">How it works</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium">1</span>
              <p>Connect both devices to the same WiFi or hotspot</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium">2</span>
              <p>Open this app on both devices and tap "Start"</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium">3</span>
              <p>Devices will auto-discover each other - no internet needed!</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Works 100% offline • No server • Direct device-to-device
        </p>
      </div>
    </div>
  );
}
