import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from 'components/ui/button';
import { params } from 'utils/consts';
import { useStopComm } from 'hooks/comms/launch/useStopComm';
import getCommColumns from './ListComms/commColumns';
import type { Comm } from 'hooks/comms/list/useComms';

import { CommDetailView } from './CommDetail/CommsDetailView';
import LaunchCommunicationPanel from './LaunchComm/LaunchCommunicationPanel';
import CommunicationsListPanel from './ListComms/CommunicationsListPanel';
import CommsSettingsPanel from './Settings/CommSettingsPanel';
import { useToasts } from 'hooks/useToasts';

type TabKey = 'launch' | 'list' | 'settings';

const TabButton = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={['relative px-4 py-3 text-sm font-medium', active ? 'text-blue-700' : 'text-zinc-700 hover:text-zinc-900'].join(' ')}>
    {children}
    <span className={['absolute left-0 right-0 -bottom-px h-[2px] rounded-full', active ? 'bg-blue-600' : 'bg-transparent'].join(' ')} />
  </button>
);

const CommsTab = ({ tokenResponse, permissions }) => {
  const canLaunch = permissions?.includes('bc.comms.launch');
  const canList = permissions?.includes('bc.comms.list');

  const isDev = process.env.NODE_ENV === 'development';
  const isStandalone = params.standaloneMode;
  const showListView = isDev || isStandalone;

  const { pushToast } = useToasts();

  const [activeTab, setActiveTab] = useState<TabKey>('list');

  const [selected, setSelected] = useState<{ id: string; row?: Comm | null } | null>(null);

  const stopComm = useStopComm(tokenResponse);

  const commColumns = useMemo<ColumnDef<Comm>[]>(() => {
    return getCommColumns({
      onSelect: (comm) => setSelected({ id: comm.id, row: comm }),
      stopComm,
      permissions,
    });
  }, [stopComm, permissions]);

  useEffect(() => {
    setActiveTab(canLaunch ? 'launch' : 'list');
  }, [canLaunch]);

  if (selected) {
    const isStopped = selected.row?.notificationStatus?.toLowerCase() === 'stopped' || selected.row?.notificationStatus === 'completed';

    return (
      <CommDetailView
        commId={selected.id}
        token={tokenResponse}
        onBack={() => setSelected(null)}
        right={
          permissions?.includes('bc.comms.launch') && (
            <Button variant="destructive" size="sm" disabled={stopComm.isPending || isStopped} onClick={() => stopComm.mutate({ commId: selected.id })}>
              Stop
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="w-full">
      <div className="border-b border-zinc-200">
        <div className="flex items-center gap-2">
          {canLaunch && (
            <TabButton active={activeTab === 'launch'} onClick={() => setActiveTab('launch')}>
              Launch Communication
            </TabButton>
          )}
          {canList && (
            <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')}>
              Communication List
            </TabButton>
          )}
          {canLaunch && (
            <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
              Settings
            </TabButton>
          )}
        </div>
      </div>

      <div className="pt-6">
        {activeTab === 'launch' && canLaunch ? <LaunchCommunicationPanel tokenResponse={tokenResponse} permissions={permissions} /> : null}

        {activeTab === 'list' && canList ? <CommunicationsListPanel tokenResponse={tokenResponse} permissions={permissions} columns={commColumns} showListView={showListView} /> : null}

        {activeTab === 'settings' && canLaunch ? (
          <CommsSettingsPanel
            pushToast={pushToast}
            onSaved={() => {
              if (canLaunch) setActiveTab('launch');
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CommsTab;
