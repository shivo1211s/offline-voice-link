import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTyping(currentProfileId: string | null, chatPartnerId: string | null) {
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for partner typing
  useEffect(() => {
    if (!currentProfileId || !chatPartnerId) return;

    const channel = supabase
      .channel('typing-indicator')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `user_id=eq.${chatPartnerId}`
        },
        (payload) => {
          const data = payload.new as { chat_partner_id: string; is_typing: boolean };
          if (data.chat_partner_id === currentProfileId) {
            setIsPartnerTyping(data.is_typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId, chatPartnerId]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!currentProfileId || !chatPartnerId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Upsert typing indicator
    await supabase
      .from('typing_indicators')
      .upsert({
        user_id: currentProfileId,
        chat_partner_id: chatPartnerId,
        is_typing: isTyping
      }, {
        onConflict: 'user_id,chat_partner_id'
      });

    // Auto-reset typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  }, [currentProfileId, chatPartnerId]);

  return {
    isPartnerTyping,
    setTyping
  };
}
