"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

type RealtimeNotification = {
  id: string;
  workspace_id: string;
  title: string;
  read: boolean;
  link?: string | null;
};

export function useRealtimeNotifications({
  workspaceId,
  userId,
  initialUnread,
}: {
  workspaceId: string;
  userId: string;
  initialUnread: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on<RealtimeNotification>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.workspace_id === workspaceId) {
            setUnreadCount((c) => c + 1);
            toast(payload.new.title, {
              action: payload.new.link
                ? { label: "View", onClick: () => (window.location.href = payload.new.link!) }
                : undefined,
            });
          }
        },
      )
      .on<RealtimeNotification>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.old && !payload.old.read && payload.new.read) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, userId]);

  return { unreadCount, setUnreadCount };
}
