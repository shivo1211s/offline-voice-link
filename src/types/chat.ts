export interface Profile {
  id: string;
  user_id: string | null;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'audio' | 'image';
  status: 'sent' | 'delivered' | 'seen';
  created_at: string;
}

export interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface TypingIndicator {
  id: string;
  user_id: string;
  chat_partner_id: string;
  is_typing: boolean;
  updated_at: string;
}
