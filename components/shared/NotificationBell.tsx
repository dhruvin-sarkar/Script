'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Award, Bell, CheckCircle, MessageSquare, ThumbsUp, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { api } from '@/app/providers';

interface NotificationItem {
  id: string;
  type: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
  actor: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  } | null;
  threadTitle: string | null;
  relatedPostType: string | null;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'follow':
      return UserPlus;
    case 'answer':
      return MessageSquare;
    case 'new_post':
      return MessageSquare;
    case 'accepted':
      return CheckCircle;
    case 'vote':
      return ThumbsUp;
    case 'badge':
      return Award;
    default:
      return Bell;
  }
}

function formatNotificationText(notification: NotificationItem): string {
  const actor = notification.actor?.username ? `@${notification.actor.username}` : 'Someone';
  const threadTitle = notification.threadTitle ? `"${notification.threadTitle}"` : 'your thread';
  const data =
    notification.data && typeof notification.data === 'object' ? notification.data : null;
  const badgeName =
    data && typeof Reflect.get(data, 'badgeName') === 'string'
      ? (Reflect.get(data, 'badgeName') as string)
      : 'new';

  switch (notification.type) {
    case 'follow':
      return `${actor} started following you`;
    case 'answer':
      return `${actor} answered your question: ${threadTitle}`;
    case 'new_post':
      return `${actor} posted a new thread: ${threadTitle}`;
    case 'accepted':
      return `Your answer was accepted on: ${threadTitle}`;
    case 'vote':
      return `${actor} upvoted your ${notification.relatedPostType?.toLowerCase() ?? 'post'}`;
    case 'badge':
      return `You earned the "${badgeName}" badge!`;
    default:
      return notification.threadTitle ?? 'You have a new notification';
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const unreadQuery = api.notification.getUnreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const listQuery = api.notification.list.useQuery(
    { page: 1, unreadOnly: false },
    {
      enabled: open,
    },
  );
  const markRead = api.notification.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([unreadQuery.refetch(), listQuery.refetch()]);
    },
  });

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;
  const badgeText = unreadCount > 9 ? '9+' : unreadCount.toString();

  useEffect(() => {
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;

    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount]);

  const notifications = useMemo(() => listQuery.data?.notifications ?? [], [listQuery.data]);

  return (
    <div className="relative">
      <button
        type="button"
        className="group relative rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)]"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--bg-base)] bg-[var(--error)] px-1 text-[10px] font-bold text-white">
            {badgeText}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-[70] mt-3 w-[360px] rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
              <button
                type="button"
                className="text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                onClick={() => markRead.mutate({})}
              >
                Mark all as read
              </button>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {listQuery.isLoading ? (
                <p className="p-3 text-sm text-[var(--text-secondary)]">Loading notifications...</p>
              ) : notifications.length ? (
                notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors',
                        notification.isRead
                          ? 'bg-transparent hover:bg-[var(--bg-elevated)]'
                          : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)]',
                      )}
                      onClick={() => {
                        if (!notification.isRead) {
                          markRead.mutate({ id: notification.id });
                        }
                      }}
                    >
                      <Icon
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          notification.type === 'accepted'
                            ? 'text-[var(--success)]'
                            : 'text-[var(--text-muted)]',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text-primary)]">
                          {formatNotificationText(notification)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="p-3 text-sm text-[var(--text-secondary)]">You’re all caught up.</p>
              )}
            </div>

            <Link
              href="/notifications"
              className="mt-3 block rounded-xl px-3 py-2 text-center text-sm text-[var(--accent)] transition-colors hover:bg-[var(--bg-elevated)]"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
