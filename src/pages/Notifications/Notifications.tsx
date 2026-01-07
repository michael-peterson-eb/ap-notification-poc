import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Tabs } from './components';
import { useOrgId } from 'hooks/useOrgId';
import IncidentsTab from './Tabs/IncidentsTab';
import CommsTab from './Tabs/CommsTab';
import { params } from 'utils/consts';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function Notifications({ open, onOpenChange }: Props) {
  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Notifications" widthClassName="max-w-6xl">
      <NotificationsContent />
    </Modal>
  );
}

function NotificationsContent() {
  const { data: ORG_ID } = useOrgId();
  const [tab, setTab] = useState<'incidents' | 'comms'>('comms');

  return (
    <div className="w-full h-full bg-zinc-50">
      <div className="flex flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Notifications</h2>
            <div className="mt-1 text-xs text-zinc-500">Org: {ORG_ID}</div>
            <div className="mt-1 text-xs text-zinc-500">Plan: {params.id}</div>
          </div>

          <div className="flex items-center gap-3">
            <Tabs tab={tab} onTabChange={setTab} />
          </div>
        </div>

        {/* Tabbed content */}
        {tab === 'incidents' ? <IncidentsTab /> : <CommsTab />}
      </div>
    </div>
  );
}
