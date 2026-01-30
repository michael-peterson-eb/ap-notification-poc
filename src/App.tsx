import React, { useEffect, useState } from 'react';
import Notifications from './pages/Notifications/Notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from 'hooks/useToasts';

const queryClient = new QueryClient();

export default function App({ isDev, isStandalone }: { isDev?: boolean; isStandalone?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // DOM button calls this.
    window.__openNotificationsModal = () => setOpen(true);
    return () => {
      delete window.__openNotificationsModal;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Notifications open={open} onOpenChange={setOpen} isStandalone={isStandalone} isDev={isDev} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
