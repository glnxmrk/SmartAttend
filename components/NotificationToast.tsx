import React from 'react';
import { Notification } from '../types';
import { Bell, CheckCircle, Info } from 'lucide-react';

interface NotificationToastProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => (
        <div 
          key={notif.id}
          className={`
            pointer-events-auto transform transition-all duration-500 ease-in-out
            flex items-start gap-3 p-4 rounded-lg shadow-lg border border-opacity-20
            ${notif.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500'}
          `}
          role="alert"
        >
          <div className={`mt-0.5 ${notif.type === 'success' ? 'text-green-600' : 'text-blue-600'}`}>
            {notif.type === 'success' ? <CheckCircle size={18} /> : <Info size={18} />}
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-bold ${notif.type === 'success' ? 'text-green-800' : 'text-blue-800'}`}>
              Notification Sent
            </h4>
            <p className={`text-xs mt-1 ${notif.type === 'success' ? 'text-green-700' : 'text-blue-700'}`}>
              {notif.message}
            </p>
          </div>
          <button 
            onClick={() => removeNotification(notif.id)}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
