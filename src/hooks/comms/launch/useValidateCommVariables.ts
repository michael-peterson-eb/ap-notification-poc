import { useMutation } from '@tanstack/react-query';

export type ValidationVariable = {
  id: string;
  value: string | string[];
};

type ValidateVarsArgs = {
  variables: ValidationVariable[];
};

export type ValidateVarsResult = {
  ok: boolean;
  raw: any;
  messages: string[];
};

function normalizeValidationResult(raw: any): ValidateVarsResult {
  const failures = raw?.detail?.failure;
  const messages: string[] = [];

  if (Array.isArray(failures)) {
    for (const f of failures) {
      // Keep ID in the message (helps map back to fields if needed)
      const id = f?.id ? String(f.id) : '';
      const msg = String(f?.message ?? 'Invalid value').trim();
      messages.push(id ? `${id}: ${msg}` : msg);
    }
  }

  const ok = !Array.isArray(failures) || failures.length === 0;

  return { ok, raw, messages };
}

async function postValidateVariables(idToken: string, variables: ValidationVariable[]): Promise<ValidateVarsResult> {
  const url = 'https://api.everbridge.net/managerapps/communications/v1/variables/validation';

  // array of { id, value }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(variables),
  });

  const text = await res.text().catch(() => '');
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    const msg = json?.detail ?? json?.message ?? json?.error ?? `${res.status} ${res.statusText}`;
    return { ok: false, raw: json, messages: [String(msg)] };
  }

  return normalizeValidationResult(json);
}

export function useValidateCommVariables(tokenResponse: any) {
  const token = tokenResponse?.data?.id_token;

  return useMutation<ValidateVarsResult, Error, ValidateVarsArgs>({
    mutationKey: ['validate-comm-variables'],
    mutationFn: async ({ variables }) => {
      if (!token) throw new Error('Missing id_token');

      // If no variables, proceed
      if (!variables?.length) return { ok: true, raw: null, messages: [] };

      // Remove empties for now
      const cleaned = variables.filter((v) => {
        if (Array.isArray(v.value)) return v.value.filter((x) => String(x).trim()).length > 0;
        return String(v.value ?? '').trim().length > 0;
      });

      if (!cleaned.length) return { ok: true, raw: null, messages: [] };

      return postValidateVariables(token, cleaned);
    },
  });
}
