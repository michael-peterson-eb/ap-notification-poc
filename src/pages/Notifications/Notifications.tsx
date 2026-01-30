import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Tabs } from './components';
import { useOrgId } from 'hooks/useOrgId';
import IncidentsTab from './Tabs/IncidentsTab';
import CommsTab from './Tabs/Comms/CommsTab';
import { params } from 'utils/consts';
import { on } from 'events';

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isStandalone?: boolean;
  isDev?: boolean;
};

export default function Notifications({ open, onOpenChange, isStandalone, isDev }: Props) {
  if (isStandalone || isDev) return <NotificationsContent isDev={isDev} />;

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Notifications" widthClassName="max-w-6xl">
      <NotificationsContent />
    </Modal>
  );
}

function NotificationsContent({ isDev }: { isDev?: boolean }) {
  return (
    <div className="w-full h-full">
      <div className={`flex flex-col gap-3 ${isDev ? 'p-10' : ''}`}>
        <CommsTab />
      </div>
    </div>
  );
}
