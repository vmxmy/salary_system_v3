import React, { useState, useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (message.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(message.id);
      }, message.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  const getAlertClass = () => {
    switch (message.type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return '';
    }
  };

  return (
    <div className={`alert ${getAlertClass()}`}>
      <span>{message.message}</span>
      <button 
        className="btn btn-ghost btn-xs"
        onClick={() => onClose(message.id)}
      >
        ✕
      </button>
    </div>
  );
};

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onClose }) => {
  return (
    <div className="toast toast-top toast-end">
      {messages.map(message => (
        <Toast key={message.id} message={message} onClose={onClose} />
      ))}
    </div>
  );
};

// Toast Hook
export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = (type: ToastMessage['type'], message: string, duration?: number) => {
    const id = Date.now().toString();
    setMessages(prev => [...prev, { id, type, message, duration }]);
  };

  const removeToast = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const toast = {
    success: (message: string, duration?: number) => showToast('success', message, duration),
    error: (message: string, duration?: number) => showToast('error', message, duration),
    warning: (message: string, duration?: number) => showToast('warning', message, duration),
    info: (message: string, duration?: number) => showToast('info', message, duration),
  };

  return { messages, removeToast, toast };
};