import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

export function useMessages(currentProfileId: string | null, chatPartnerId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!currentProfileId || !chatPartnerId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentProfileId},receiver_id.eq.${chatPartnerId}),and(sender_id.eq.${chatPartnerId},receiver_id.eq.${currentProfileId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages((data as Message[]) || []);
    }
    setLoading(false);
  }, [currentProfileId, chatPartnerId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!currentProfileId || !chatPartnerId) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (
            (newMessage.sender_id === currentProfileId && newMessage.receiver_id === chatPartnerId) ||
            (newMessage.sender_id === chatPartnerId && newMessage.receiver_id === currentProfileId)
          ) {
            setMessages((prev) => [...prev, newMessage]);
            
            // Mark as delivered if we're the receiver
            if (newMessage.receiver_id === currentProfileId && newMessage.status === 'sent') {
              markAsDelivered(newMessage.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId, chatPartnerId]);

  const sendMessage = async (content: string, messageType: 'text' | 'audio' | 'image' = 'text') => {
    if (!currentProfileId || !chatPartnerId) return;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentProfileId,
        receiver_id: chatPartnerId,
        content,
        message_type: messageType,
        status: 'sent'
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive'
      });
    }

    return data;
  };

  const markAsDelivered = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('id', messageId);
  };

  const markAsSeen = async (messageIds: string[]) => {
    await supabase
      .from('messages')
      .update({ status: 'seen' })
      .in('id', messageIds);
  };

  return {
    messages,
    loading,
    sendMessage,
    markAsSeen,
    refetch: fetchMessages
  };
}
