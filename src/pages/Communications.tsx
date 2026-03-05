import React, { useEffect } from 'react';
import { Modal } from 'components/Modal';
import CommsTabShell from 'components/Communications/CommsTabShell';
import { useEverbridgeToken } from 'hooks/useEverbridgeToken';
import { useToasts } from 'hooks/useToasts';
import { useValidPermissions } from 'hooks/useValidPermissions';
import HeaderBar from 'components/HeaderBar';

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isStandalone?: boolean;
  isDev?: boolean;
};

export default function Communications({ open, onOpenChange, isStandalone, isDev }: Props) {
  if (isStandalone)
    return (
      <>
        <CommunicationsContent isDev={isDev} isStandalone={isStandalone} />
      </>
    );

  if (isDev)
    return (
      <>
        <HeaderBar onClose={() => onOpenChange(false)} />
        <CommunicationsContent isDev={isDev} isStandalone={isStandalone} />
      </>
    );

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Communications">
      <HeaderBar onClose={() => onOpenChange(false)} />
      <CommunicationsContent />
    </Modal>
  );
}

function CommunicationsContent({ isDev, isStandalone }: { isDev?: boolean; isStandalone?: boolean }) {
  const { pushToast } = useToasts();
  const { permissions } = useValidPermissions();
  const tokenQuery = useEverbridgeToken({
    pushToast,
    isDev,
  });

  useEffect(() => {
    if (tokenQuery.isError) {
      console.error('Error fetching Everbridge token:', tokenQuery.error);
      pushToast({
        title: 'Error verifying credentials with Everbridge',
        message: 'Please verify your credentials in settings, and make sure you have established the necessary custom method in the platform (see documentation).',
        type: 'error',
      });
    }
  }, [tokenQuery.isError, tokenQuery.error, pushToast]);

  if (isStandalone)
    <div className={`h-full bg-[linear-gradient(146deg,rgba(224,237,255,0.41)_26.27%,rgba(218,217,255,0.50)_37.44%,rgba(224,235,255,0.41)_61.17%,rgba(233,240,255,0.50)_84.9%)] relative w-full`}>
      <div className="relative w-full h-full">
        <div className="flex-1 min-h-0 space-y-4 h-full">
          <CommsTabShell tokenResponse={tokenQuery} permissions={permissions} />
        </div>
      </div>
    </div>;

  return (
    <div className={`h-full bg-white`}>
      <div className="p-10 relative w-full h-full bg-repeat-y bg-[linear-gradient(146deg,rgba(224,237,255,0.41),rgba(218,217,255,0.50),rgba(224,235,255,0.41),rgba(233,240,255,0.50))]">
        <div className="flex-1 min-h-0 space-y-4 h-full">
          <CommsTabShell tokenResponse={tokenQuery} permissions={permissions} />
        </div>
      </div>
    </div>
  );
}
