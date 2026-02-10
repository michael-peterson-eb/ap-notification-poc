import React, { useRef, useState, useEffect } from 'react';
import { Modal } from 'components/Modal';
import CommsTab from './Tabs/Comms/CommsTab';
import { useEverbridgeToken } from 'hooks/useEverbridgeToken';
import { useToasts } from 'hooks/useToasts';
import Settings from '../Settings';
import { Settings as SettingsIcon } from 'lucide-react';
import clsx from 'clsx';
import { useValidPermissions } from 'hooks/useValidPermissions';

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
  const { pushToast } = useToasts();
  const { permissions } = useValidPermissions();
  const tokenQuery = useEverbridgeToken({
    pushToast,
    isDev,
  });

  const [page, setPage] = useState<'comms' | 'settings'>('comms');
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);

  // Return focus to settings button when closing settings
  useEffect(() => {
    if (page === 'comms') {
      settingsButtonRef.current?.focus();
    }
  }, [page]);

  useEffect(() => {
    if (tokenQuery.isError) {
      console.error('Error fetching Everbridge token:', tokenQuery.error);
      pushToast({
        title: 'Error verifying credentials with Everbridge',
        message: 'Please verify your credentials in settings, and make sure you have established the necessary custom method in the platform (see documentation).',
        type: 'error',
      });
    }
  }, [tokenQuery.isError, tokenQuery.error]);

  return (
    <div className={`relative w-full h-full ${isDev ? 'p-10' : ''}`}>
      {/* Settings icon – top right, no header */}
      {permissions?.includes('bc.comms.launch') && (
        <div className="flex justify-end">
          <button
            ref={settingsButtonRef}
            aria-haspopup="dialog"
            aria-expanded={page === 'settings'}
            title="Settings"
            className="self-end top-2 right-2 z-10 p-2 rounded hover:bg-zinc-100 focus:outline-none"
            onClick={() => setPage((p) => (p === 'settings' ? 'comms' : 'settings'))}>
            <SettingsIcon size={18} />
          </button>
        </div>
      )}

      {/* Sliding viewport */}
      <div className="relative w-full h-full overflow-hidden">
        <div className={clsx('flex h-full w-[200%] transition-transform duration-300 ease-in-out', page === 'comms' ? 'translate-x-0' : '-translate-x-1/2')}>
          <div className="w-1/2 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto space-y-4">
              <CommsTab tokenResponse={tokenQuery} permissions={permissions} />
            </div>
          </div>

          <div className="w-1/2 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              <Settings pushToast={pushToast} refresh={tokenQuery.refetch} onClose={() => setPage('comms')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
