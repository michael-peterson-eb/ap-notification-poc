import React, { useState } from 'react';
import { LCAPConnector } from './components/LCAPConnector';
import Notifications from './components/Notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataProvider } from 'context/DataContext';
import { appParams } from 'utils/appParams';

const queryClient = new QueryClient();

export default function App() {
  const [proceeded, setProceeded] = useState(false);
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev && !proceeded) return <LCAPConnector onProceed={() => setProceeded(true)} />;

  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider appParams={appParams}>
        <Notifications />
      </DataProvider>
    </QueryClientProvider>
  );
}
