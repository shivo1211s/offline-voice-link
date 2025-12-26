import { Peer } from '@/types/p2p';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Search, Users, Wifi, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface PeerListProps {
  peers: Peer[];
  selectedPeer: Peer | null;
  onSelectPeer: (peer: Peer) => void;
  isHost: boolean;
  hostAddress: string;
}

export function PeerList({ peers, selectedPeer, onSelectPeer, isHost, hostAddress }: PeerListProps) {
  const [search, setSearch] = useState('');

  const filteredPeers = peers.filter((p) =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  const onlinePeers = filteredPeers.filter(p => p.isOnline);
  const offlinePeers = filteredPeers.filter(p => !p.isOnline);

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Devices</h2>
          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {onlinePeers.length} online
          </span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 mb-3">
          {isHost ? (
            <Wifi className="w-4 h-4 text-primary" />
          ) : (
            <Wifi className="w-4 h-4 text-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {isHost ? 'Hosting' : 'Connected'}: {hostAddress}
          </span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-secondary/50 border-border"
          />
        </div>
      </div>

      {/* Peer List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredPeers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No devices found</p>
              <p className="text-xs mt-1">Waiting for others to join...</p>
            </div>
          ) : (
            <>
              {/* Online Peers */}
              {onlinePeers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground px-3 mb-2">
                    ONLINE ({onlinePeers.length})
                  </p>
                  {onlinePeers.map((peer) => (
                    <PeerItem
                      key={peer.id}
                      peer={peer}
                      isSelected={selectedPeer?.id === peer.id}
                      onSelect={() => onSelectPeer(peer)}
                    />
                  ))}
                </div>
              )}

              {/* Offline Peers */}
              {offlinePeers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-3 mb-2">
                    OFFLINE ({offlinePeers.length})
                  </p>
                  {offlinePeers.map((peer) => (
                    <PeerItem
                      key={peer.id}
                      peer={peer}
                      isSelected={selectedPeer?.id === peer.id}
                      onSelect={() => onSelectPeer(peer)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PeerItem({ peer, isSelected, onSelect }: { peer: Peer; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-secondary/80 ${
        isSelected ? 'bg-primary/10 border border-primary/20' : ''
      }`}
    >
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-background">
          <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
            {peer.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {peer.isOnline && (
          <span className="absolute bottom-0 right-0 online-indicator" />
        )}
      </div>

      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-foreground truncate">
          {peer.username}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary/70 font-mono">{peer.ip}</span>
          <span className="text-xs text-muted-foreground">
            {peer.isOnline
              ? '• Online'
              : `• ${formatDistanceToNow(peer.lastSeen, { addSuffix: true })}`}
          </span>
        </div>
      </div>
    </button>
  );
}
