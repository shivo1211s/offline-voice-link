import { LocalProfile } from '@/types/p2p';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Trash2, Wifi } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface P2PHeaderProps {
  profile: LocalProfile;
  isHost: boolean;
  hostAddress: string;
  onDisconnect: () => void;
  onLogout: () => void;
  onResetCache?: () => void;
}

export function P2PHeader({
  profile,
  isHost,
  hostAddress,
  onDisconnect,
  onLogout,
  onResetCache,
}: P2PHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border glass-panel">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wifi className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">
              LAN Chat
            </h1>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50">
          <span className={`w-2 h-2 rounded-full ${isHost ? 'bg-primary' : 'bg-green-500'}`} />
          <span className="text-xs text-muted-foreground">
            {isHost ? 'Hosting' : 'Connected'}: {hostAddress}
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-3 rounded-xl hover:bg-secondary/80">
            <span className="hidden sm:block text-sm font-medium text-foreground">
              {profile.username}
            </span>
            <Avatar className="w-8 h-8 border-2 border-background">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {profile.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-2">
            <p className="font-medium text-foreground">{profile.username}</p>
            <p className="text-xs text-muted-foreground">Local Profile</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDisconnect} className="cursor-pointer">
            <Wifi className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
          {onResetCache && (
            <DropdownMenuItem onClick={onResetCache} className="cursor-pointer text-amber-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Cache
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
