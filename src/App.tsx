import React, { useState } from 'react';
import { LCAPConnector } from './components/LCAPConnector';
import Notifications from './pages/Notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  // const [proceeded, setProceeded] = useState(false);
  // const isDev = process.env.NODE_ENV !== 'production';

  // if (isDev && !proceeded) return <LCAPConnector onProceed={() => setProceeded(true)} />;
  return (
    <QueryClientProvider client={queryClient}>
      <Notifications />
    </QueryClientProvider>
  );
}
