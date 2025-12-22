import React, { useEffect, useState } from 'react';
import Notifications from './pages/Notifications/Notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App({ isDev }: { isDev?: boolean }) {
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
      <Notifications open={open} onOpenChange={setOpen} />
      {isDev && (
        <div style={{ padding: 16 }}>
          <button onClick={() => window.__openNotificationsModal?.()}>Open Notifications</button>
        </div>
      )}
    </QueryClientProvider>
  );
}
