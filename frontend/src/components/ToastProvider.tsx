import React from 'react';
import { useToast } from '../hooks/useToast';

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { ToastContainer } = useToast();

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
};