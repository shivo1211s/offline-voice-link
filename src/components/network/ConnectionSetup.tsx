import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wifi, Radio, User } from 'lucide-react';

interface ConnectionSetupProps {
  onCreateProfile: (username: string) => Promise<any>;
  onStartHost: () => void;
  onJoinNetwork: (hostIp?: string) => void;
  hasProfile: boolean;
  username?: string;
}

export function ConnectionSetup({
  onCreateProfile,
  onStartHost,
  onJoinNetwork,
  hasProfile,
  username,
}: ConnectionSetupProps) {
  const [step, setStep] = useState<'profile' | 'connection'>(hasProfile ? 'connection' : 'profile');
  const [newUsername, setNewUsername] = useState('');
  const [hostIp, setHostIp] = useState('');
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
            Connect
          </h1>
          <p className="text-muted-foreground mt-2">
            Hello, <span className="text-primary font-medium">{username}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Host Option */}
          <div className="p-4 rounded-2xl border border-border bg-card/50 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Radio className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Host Network</h3>
                <p className="text-sm text-muted-foreground">
                  Create a hotspot for others to join
                </p>
              </div>
            </div>
            <Button
              onClick={onStartHost}
              className="w-full h-11 rounded-xl"
            >
              Start Hosting
            </Button>
          </div>

          {/* Join Option */}
          <div className="p-4 rounded-2xl border border-border bg-card/50 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Wifi className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Join Network</h3>
                <p className="text-sm text-muted-foreground">
                  Connect to a host's network
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="Host IP (optional for local)"
                value={hostIp}
                onChange={(e) => setHostIp(e.target.value)}
                className="h-11 rounded-xl"
              />
              <Button
                onClick={() => onJoinNetwork(hostIp || undefined)}
                variant="secondary"
                className="w-full h-11 rounded-xl"
              >
                Join Network
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Works 100% offline on local WiFi/Hotspot
        </p>
      </div>
    </div>
  );
}
