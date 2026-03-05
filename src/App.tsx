import React, { useEffect, useState } from 'react';
import Communications from 'pages/Communications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from 'hooks/useToasts';

const queryClient = new QueryClient();

export default function App({ isDev, isStandalone }: { isDev?: boolean; isStandalone?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // DOM button calls this.
    window.__openCommunicationsModal = () => setOpen(true);
    window.__closeCommunicationsModal = () => setOpen(false);
    return () => {
      delete window.__openCommunicationsModal;
      delete window.__closeCommunicationsModal;
    };
  }, []);

  useEffect(() => {
  const style = document.createElement('style');
  style.innerHTML = `
    .rbs-pageTool {
      z-index: 1 !important;
    }
    .rbs-sidebar {
      z-index: 1 !important;
    } 
  `;
  document.head.appendChild(style);

  return () => {
    document.head.removeChild(style);
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
