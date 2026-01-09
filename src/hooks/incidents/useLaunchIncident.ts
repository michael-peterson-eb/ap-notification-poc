import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEverbridgeToken } from '../useEverbridgeToken';

type TemplateDetailsResponse = {
  result?: {
    id: number | string;
    phaseTemplates?: Array<{
      id: number | string;
      name?: string;
      // In your tenant, phaseDefinitions is an array (1001/1002/1003)
      phaseDefinitions?: Array<{ id: number; name?: string }>;
    }>;
  };
};

export type IncidentVariableItem = {
  variableId: number | string;
  val: string[]; // Everbridge template variables are commonly array-of-strings
};

export type LaunchIncidentArgs = {
  orgId: string;
  templateId: number | string;

  /**
   * 1001 = New, 1002 = Updated, 1003 = Closed
   * default = 1001 (New)
   */
  phaseDefinitionId?: number;

  /** Required values from doc enum: Launch | LaunchThenClose (default Launch) */
  incidentAction?: 'Launch' | 'LaunchThenClose';

  /** Optional overrides */
  name?: string;

  /** Optional: if your template requires variables */
  incidentVariableItems?: IncidentVariableItem[];

  /**
   * Escape hatch: if your tenant expects phaseTemplate to include more fields
   * (rare), you can pass a custom object to merge in.
   */
  phaseTemplateOverrides?: Record<string, any>;
};

async function getTemplateDetails(params: { orgId: string; templateId: number | string; idToken: string }): Promise<TemplateDetailsResponse> {
  const url = `https://api.everbridge.net/rest/incidentTemplates/${params.orgId}/${params.templateId}`;

  const resp = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw json;

  return json as TemplateDetailsResponse;
}

function resolvePhaseTemplateId(templateResp: TemplateDetailsResponse, phaseDefinitionId: number) {
  const phaseTemplates = templateResp?.result?.phaseTemplates ?? [];

  // Your template structure: phaseTemplates[0].phaseDefinitions includes 1001/1002/1003
  const match = phaseTemplates.find((pt) => Array.isArray(pt.phaseDefinitions) && pt.phaseDefinitions.some((pd) => pd?.id === phaseDefinitionId));

  if (!match?.id) {
    throw new Error(`Could not find a phaseTemplate for phaseDefinitionId=${phaseDefinitionId}`);
  }

  return match.id;
}

async function postLaunchIncident(params: { orgId: string; idToken: string; body: any }) {
  const url = `https://api.everbridge.net/rest/incidents/${params.orgId}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify(params.body),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw json;

  // docs say response is { message: "OK", id: <createdIncidentId> } :contentReference[oaicite:1]{index=1}
  return json as { message: string; id: number };
}

export function useLaunchIncident() {
  const qc = useQueryClient();
  const tokenQ = useEverbridgeToken();
  const idToken = tokenQ.data?.id_token;

  return useMutation({
    mutationFn: async (args: LaunchIncidentArgs) => {
      if (!idToken) throw new Error('No token available');

      const incidentAction = args.incidentAction ?? 'Launch';
      const phaseDefinitionId = args.phaseDefinitionId ?? 1001; // New

      // 1) Get template details so we can pick the correct phase template
      const templateResp = await getTemplateDetails({
        orgId: args.orgId,
        templateId: args.templateId,
        idToken,
      });

      const phaseTemplateId = resolvePhaseTemplateId(templateResp, phaseDefinitionId);

      // 2) Build body matching doc UI: incidentPhases is REQUIRED and contains phaseTemplate
      // NOTE: we include phaseDefinitionId alongside phaseTemplate id because your templates
      // carry multiple definitions (New/Updated/Closed). If your tenant ignores it, fine.
      const body: any = {
        incidentAction,
        ...(args.name ? { name: args.name } : {}),
        incidentPhases: [
          {
            phaseTemplate: {
              // phase template id (from template.result.phaseTemplates[x].id)
              id: phaseTemplateId,

              // ✅ incident template id (from template.result.id)
              templateId: args.templateId,

              // your tenant exposes phaseDefinitions[]; we select which one we’re launching
              phaseDefinitions: [{ id: phaseDefinitionId }],
            },

            ...(args.incidentVariableItems?.length ? { incidentVariableItems: args.incidentVariableItems } : {}),
          },
        ],
      };

      return postLaunchIncident({ orgId: args.orgId, idToken, body });
    },

    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['incidents', vars.orgId] });
    },
  });
}
