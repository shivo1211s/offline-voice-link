import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { AuthForm } from '@/components/auth/AuthForm';
import { Header } from '@/components/layout/Header';
import { ContactList } from '@/components/chat/ContactList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { CallScreen } from '@/components/call/CallScreen';
import { Profile } from '@/types/chat';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, profile, loading: authLoading, updateOnlineStatus } = useAuth();
  const { profiles, loading: profilesLoading } = useProfiles(profile?.id || null);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [activeCall, setActiveCall] = useState<{ contact: Profile; isIncoming: boolean } | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  // Set online status
  useEffect(() => {
    if (profile) {
      updateOnlineStatus(true);
      
      // Set offline when leaving
      const handleBeforeUnload = () => {
        updateOnlineStatus(false);
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        updateOnlineStatus(false);
      };
    }
  }, [profile, updateOnlineStatus]);

  // Handle responsive view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user || !profile) {
    return <AuthForm />;
  }

  // Handle call
  const handleCall = (contact: Profile) => {
    setActiveCall({ contact, isIncoming: false });
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  // Call screen overlay
  if (activeCall) {
    return (
      <CallScreen
        contact={activeCall.contact}
        isIncoming={activeCall.isIncoming}
        onEnd={handleEndCall}
        onAccept={() => {}}
        onReject={handleEndCall}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header profile={profile} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List - hidden on mobile when chat is open */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
            isMobileView && selectedContact ? 'hidden' : 'block'
          }`}
        >
          <ContactList
            profiles={profiles}
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
            loading={profilesLoading}
          />
        </div>

        {/* Chat Window */}
        <div
          className={`flex-1 ${
            isMobileView && !selectedContact ? 'hidden' : 'block'
          }`}
        >
          {selectedContact ? (
            <ChatWindow
              currentProfile={profile}
              chatPartner={selectedContact}
              onBack={() => setSelectedContact(null)}
              onCall={() => handleCall(selectedContact)}
            />
          ) : (
            <EmptyChat />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
