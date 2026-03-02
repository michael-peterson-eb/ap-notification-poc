import React, { useEffect, useState } from 'react';
import Communications from 'pages/Communications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from 'hooks/useToasts';
import HeaderBar from 'components/HeaderBar';

const queryClient = new QueryClient();

export default function App({ isDev, isStandalone }: { isDev?: boolean; isStandalone?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // DOM button calls this.
    window.__openCommunicationsModal = () => setOpen(true);
    return () => {
      delete window.__openCommunicationsModal;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Communications open={open} onOpenChange={setOpen} isStandalone={isStandalone} isDev={isDev} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
