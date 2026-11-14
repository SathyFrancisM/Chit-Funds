import React from 'react';
import { X, Bell, Check, Clock, AlertTriangle, Layers, Calendar } from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectNotification: (item: NotificationItem) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllRead,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-neutral-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-[#111111] text-white rounded-lg">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-[#111111]">Notifications & Alerts</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onMarkAllRead}
                className="text-[11px] font-semibold text-neutral-600 hover:text-[#111111] underline"
              >
                Mark all read
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-2">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No notifications right now.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectNotification(item);
                    onMarkAsRead(item.id);
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-colors ${
                    item.is_read ? 'hover:bg-neutral-50' : 'bg-neutral-100/70 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[#111111] block">
                      {item.title}
                    </span>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#111111] shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {item.message}
                  </p>
                  <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between">
                    <span>{new Date(item.created_at).toLocaleDateString('en-IN')}</span>
                    {item.chit_name && (
                      <span className="font-semibold text-neutral-600">{item.chit_name}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
