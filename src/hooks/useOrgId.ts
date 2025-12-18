import { useQuery } from '@tanstack/react-query';

async function fetchEBOrgId() {
  const isDev = process.env.NODE_ENV !== 'production';
  let orgId = null;

  if (isDev) {
    orgId = process.env.REACT_APP_EVERBRIDGE_ORG_ID;
  } else {
    type SettingsRow = [
      string, // eb_client_id
      string, // eb_client_secret
      string, // eb_username
      string, // eb_user_password
    ];

    //@ts-expect-error _RB is attached to window
    const rows = (await (_RB as any).selectQuery(['eb_org_id'], '$SETTINGS', '')) as SettingsRow[];
    orgId = rows[0][0];
  }

  return orgId;
}

export function useOrgId() {
  return useQuery({
    queryKey: ['eb-org-id'],
    queryFn: fetchEBOrgId,
    retry: 0,
  });
}
