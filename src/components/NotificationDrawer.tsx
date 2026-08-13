import React from 'react';
import { X, Bell, AlertCircle, PhoneCall, CheckCircle2, ShieldAlert, Clock } from 'lucide-react';
import { NotificationItem } from '../types';
import { api } from '../services/api';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onRefresh: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onRefresh
}) => {
  if (!isOpen) return null;

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2 text-white">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Emergency Alert Center</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No alerts or notifications recorded.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all cursor-pointer ${
                  !n.isRead
                    ? n.type === 'critical_alert'
                      ? 'bg-red-950/40 border-red-800/80 text-red-200'
                      : n.type === 'call_patient'
                        ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                        : 'bg-slate-850 border-slate-700 text-white'
                    : 'bg-slate-950/50 border-slate-850 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    {n.type === 'critical_alert' && <ShieldAlert className="w-4 h-4 text-red-400" />}
                    {n.type === 'call_patient' && <PhoneCall className="w-4 h-4 text-amber-400" />}
                    {n.type === 'status_change' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    <span>{n.title}</span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300">{n.message}</p>

                {!n.isRead && (
                  <div className="flex justify-end pt-1">
                    <span className="text-[10px] text-blue-400 font-semibold hover:underline">
                      Mark as read
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
