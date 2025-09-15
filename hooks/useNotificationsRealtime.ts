import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

type OnNotification = (payload: {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
}) => void;

export function useNotificationsRealtime(userId?: string, onNotification?: OnNotification) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notif:' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${userId}` },
        (payload: any) => {
          const newRow = payload.new;
          onNotification?.({
            id: newRow.id,
            type: newRow.type,
            title: newRow.title,
            body: newRow.body,
            data: newRow.data,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNotification]);
}


