import { useQuery } from '@tanstack/react-query';

async function fetchEverbridgeToken() {
  const encodedParams = new URLSearchParams();
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    encodedParams.set('grant_type', 'client_credentials');
    encodedParams.set('client_id', process.env.REACT_APP_EVERBRIDGE_CLIENT_ID);
    encodedParams.set('client_secret', process.env.REACT_APP_EVERBRIDGE_CLIENT_SECRET);
    encodedParams.set('username', process.env.REACT_APP_EVERBRIDGE_USERNAME);
    encodedParams.set('password', process.env.REACT_APP_EVERBRIDGE_PASSWORD);
    encodedParams.set('scope', '');
  } else {
    type SettingsRow = [
      string, // eb_client_id
      string, // eb_client_secret
      string, // eb_username
      string, // eb_user_password
    ];

    //@ts-expect-error _RB is attached to window
    const rows = (await (_RB as any).selectQuery(['eb_client_id', 'eb_client_secret', 'eb_username', 'eb_user_password'], '$SETTINGS', '')) as SettingsRow[];

    const [clientId, clientSecret, username, password] = rows[0];

    encodedParams.set('grant_type', 'client_credentials');
    encodedParams.set('client_id', clientId);
    encodedParams.set('client_secret', clientSecret);
    encodedParams.set('username', username);
    encodedParams.set('password', password);
    encodedParams.set('scope', '');
  }

  const resp = await fetch('https://api.everbridge.net/authorization/v1/tokens', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: encodedParams,
  });

  const json = await resp.json();

  if (!resp.ok) throw json;
  if (!json?.id_token) throw new Error('Token response missing id_token');

  return json;
}

export function useEverbridgeToken() {
  return useQuery({
    queryKey: ['everbridgeToken'],
    queryFn: fetchEverbridgeToken,
    staleTime: 55 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
  });
}
