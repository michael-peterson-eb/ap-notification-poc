import { useEffect, useMemo, useRef } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Toast } from 'hooks/useToasts';

type EverbridgeCreds = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  roleId: string;
};

type EverbridgeSettingsRow = {
  id: number;
  eb_client_id: string;
  eb_client_secret: string;
  eb_username: string;
  eb_user_password: string;
  eb_role_id: string;
};

function isBlank(v: any) {
  return v == null || String(v).trim() === '';
}

// Safe env access (won’t crash if process is undefined)
function getEnv(key: string): string {
  const env = (globalThis as any)?.process?.env;
  return env && key in env ? String(env[key] ?? '') : '';
}
function getNodeEnv(): string {
  const env = (globalThis as any)?.process?.env?.NODE_ENV;
  return env ? String(env) : 'production'; // default safe
}

async function fetchEverbridgeToken(creds: EverbridgeCreds) {
  const encodedParams = new URLSearchParams();
  encodedParams.set('grant_type', 'password');
  encodedParams.set('client_id', creds.clientId);
  encodedParams.set('client_secret', creds.clientSecret);
  encodedParams.set('username', creds.username);
  encodedParams.set('password', creds.password);
  encodedParams.set('roleId', creds.roleId);
  encodedParams.set('scope', 'openid user-profile role');

  const resp = await fetch('https://api.everbridge.net/authorization/v1/tokens', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: encodedParams,
  });

  const json = await resp.json();
  if (!resp.ok) throw json;
  if (!json?.id_token) throw new Error('Token response missing id_token');
  return json;
}

type Params = {
  pushToast?: (t: Omit<Toast, 'id'>) => string;
  settingsRow?: EverbridgeSettingsRow | null;
  settingsLoaded?: boolean;
};

export function useEverbridgeToken({ pushToast, settingsRow, settingsLoaded }: Params): UseQueryResult<any> {
  const isDev = getNodeEnv() !== 'production';

  const devCreds: EverbridgeCreds = useMemo(
    () => ({
      clientId: getEnv('REACT_APP_EVERBRIDGE_CLIENT_ID'),
      clientSecret: getEnv('REACT_APP_EVERBRIDGE_CLIENT_SECRET'),
      username: getEnv('REACT_APP_EVERBRIDGE_USERNAME'),
      password: getEnv('REACT_APP_EVERBRIDGE_PASSWORD'),
      roleId: getEnv('REACT_APP_EVERBRIDGE_ROLE_ID'),
    }),
    []
  );

  const prodCreds: EverbridgeCreds | null = useMemo(() => {
    if (!settingsRow) return null;
    return {
      clientId: settingsRow.eb_client_id ?? '',
      clientSecret: settingsRow.eb_client_secret ?? '',
      username: settingsRow.eb_username ?? '',
      password: settingsRow.eb_user_password ?? '',
      roleId: settingsRow.eb_role_id ?? '',
    };
  }, [settingsRow]);

  const creds = isDev ? devCreds : prodCreds;

  const missingFields = useMemo(() => {
    if (isDev) {
      return [
        isBlank(devCreds.clientId) ? 'REACT_APP_EVERBRIDGE_CLIENT_ID' : null,
        isBlank(devCreds.clientSecret) ? 'REACT_APP_EVERBRIDGE_CLIENT_SECRET' : null,
        isBlank(devCreds.username) ? 'REACT_APP_EVERBRIDGE_USERNAME' : null,
        isBlank(devCreds.password) ? 'REACT_APP_EVERBRIDGE_PASSWORD' : null,
        isBlank(devCreds.roleId) ? 'REACT_APP_EVERBRIDGE_ROLE_ID' : null,
      ].filter(Boolean) as string[];
    }

    if (!settingsRow) return ['settings row missing'];

    return [
      isBlank(prodCreds?.clientId) ? 'eb_client_id' : null,
      isBlank(prodCreds?.clientSecret) ? 'eb_client_secret' : null,
      isBlank(prodCreds?.username) ? 'eb_username' : null,
      isBlank(prodCreds?.password) ? 'eb_user_password' : null,
      isBlank(prodCreds?.roleId) ? 'eb_role_id' : null,
    ].filter(Boolean) as string[];
  }, [isDev, devCreds, prodCreds, settingsRow]);

  const enabled = isDev ? missingFields.length === 0 : Boolean(settingsLoaded && settingsRow && missingFields.length === 0);

  // toast only in an effect, and only once per "missing signature"
  const lastToastKeyRef = useRef<string>('');
  useEffect(() => {
    if (!pushToast) return;

    // only toast when:
    // - dev and disabled
    // - prod and settingsLoaded and disabled
    const shouldToast = (isDev && !enabled) || (!isDev && Boolean(settingsLoaded) && !enabled);

    if (!shouldToast) return;

    const key = `${isDev ? 'dev' : 'prod'}:${missingFields.join('|')}`;
    if (lastToastKeyRef.current === key) return; // already toasted for this state
    lastToastKeyRef.current = key;

    pushToast({
      type: 'error',
      title: isDev ? 'Missing Everbridge config' : 'Missing Everbridge settings',
      message: `Please fill these in: ${missingFields.join(', ')}`,
    });
  }, [pushToast, isDev, enabled, settingsLoaded, missingFields]);

  return useQuery({
    queryKey: ['everbridgeToken'],
    enabled,
    queryFn: () => fetchEverbridgeToken(creds as EverbridgeCreds),
    staleTime: 55 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
  });
}
