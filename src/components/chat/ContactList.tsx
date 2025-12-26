import { Profile } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface ContactListProps {
  profiles: Profile[];
  selectedContact: Profile | null;
  onSelectContact: (profile: Profile) => void;
  loading: boolean;
}

export function ContactList({ profiles, selectedContact, onSelectContact, loading }: ContactListProps) {
  const [search, setSearch] = useState('');

  const filteredProfiles = profiles.filter((p) =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Contacts</h2>
          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {profiles.length}
          </span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-secondary/50 border-border"
          />
        </div>
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No contacts found</p>
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => onSelectContact(profile)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-secondary/80 ${
                  selectedContact?.id === profile.id
                    ? 'bg-primary/10 border border-primary/20'
                    : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12 border-2 border-background">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                      {profile.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {profile.is_online && (
                    <span className="absolute bottom-0 right-0 online-indicator" />
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {profile.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.is_online
                      ? 'Online'
                      : `Last seen ${formatDistanceToNow(new Date(profile.last_seen), { addSuffix: true })}`}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
