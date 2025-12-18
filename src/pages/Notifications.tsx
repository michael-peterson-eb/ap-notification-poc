import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '../components/ui/button'; // adjust if needed
import { DataTable } from '../components/DataTable'; // adjust if needed

import { useIncidentTemplates, IncidentTemplate } from '../hooks/useIncidentTemplates';
import { useIncidents, Incident } from '../hooks/useIncidents';
import { useLaunchIncident } from '../hooks/useLaunchIncident';
import { useOrgId } from 'hooks/useOrgId';

function formatDate(ms?: number) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export default function Notifications() {
  // Hooks manage paging internally now
  const { data: ORG_ID } = useOrgId();
  const templates = useIncidentTemplates(ORG_ID);
  const incidents = useIncidents(ORG_ID);
  const launch = useLaunchIncident();

  // Launch form state
  const [selectedTemplate, setSelectedTemplate] = useState<IncidentTemplate | null>(null);
  const [incidentName, setIncidentName] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');

  // Top-level loading/error (token is shared via useEverbridgeToken under the hood)
  const anyLoading = templates.isLoading || incidents.isLoading;
  const anyError = templates.error ?? incidents.error ?? null;

  const templateColumns = useMemo<ColumnDef<IncidentTemplate>[]>(() => {
    return [
      {
        id: 'launch',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const t = row.original;
              setSelectedTemplate(t);
              setIncidentName(t?.name ? `${t.name} (launched)` : '');
              setIncidentDescription('');
            }}>
            Launch
          </Button>
        ),
      },
      {
        accessorKey: 'id',
        header: 'Template ID',
        cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span>,
      },
      { accessorKey: 'name', header: 'Name' },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => row.original.category?.name ?? '',
      },
      { accessorKey: 'templateStatus', header: 'Template Status' },
      {
        id: 'lastModifiedDate',
        header: 'Last Modified',
        cell: ({ row }) => formatDate(row.original.lastModifiedDate),
      },
    ];
  }, []);

  const incidentColumns = useMemo<ColumnDef<Incident>[]>(() => {
    return [
      {
        accessorKey: 'id',
        header: 'Incident ID',
        cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span>,
      },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'incidentType', header: 'Type' },
      { accessorKey: 'incidentStatus', header: 'Status' },
      {
        id: 'lastModifiedDate',
        header: 'Last Modified',
        cell: ({ row }) => formatDate(row.original.lastModifiedDate),
      },
    ];
  }, []);

  const templatesRows = templates.rows ?? [];
  const incidentsRows = incidents.rows ?? [];

  const templatesPager = (
    <div className="flex items-center gap-2">
      <span className="text-sm">
        Page <strong>{templates.pageNumber}</strong> of <strong>{templates.totalPages}</strong>
      </span>
      <Button variant="secondary" size="sm" onClick={templates.prevPage} disabled={templates.pageNumber <= 1 || templates.isFetching}>
        Prev
      </Button>
      <Button variant="secondary" size="sm" onClick={templates.nextPage} disabled={templates.pageNumber >= templates.totalPages || templates.isFetching}>
        Next
      </Button>
    </div>
  );

  const incidentsPager = (
    <div className="flex items-center gap-2">
      <span className="text-sm">
        Page <strong>{incidents.pageNumber}</strong> of <strong>{incidents.totalPages}</strong>
      </span>
      <Button variant="secondary" size="sm" onClick={incidents.prevPage} disabled={incidents.pageNumber <= 1 || incidents.isFetching}>
        Prev
      </Button>
      <Button variant="secondary" size="sm" onClick={incidents.nextPage} disabled={incidents.pageNumber >= incidents.totalPages || incidents.isFetching}>
        Next
      </Button>
    </div>
  );

  const onLaunch = () => {
    if (!selectedTemplate) return;

    launch.mutate({
      orgId: ORG_ID,
      templateId: selectedTemplate.id,
      incidentAction: 'Launch', // or 'LaunchThenClose'
      phaseDefinitionId: 1001, // New
      name: incidentName || selectedTemplate.name,
      // optional variables if required:
      // incidentVariableItems: [{ variableId: 3083034899259790, val: ["text"] }],
    });
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <div className="text-xs opacity-70">Org: {ORG_ID}</div>
        </div>

        <div className="text-xs opacity-70">{anyLoading ? 'Loading…' : templates.idToken ? 'Authenticated' : 'Not authenticated'}</div>
      </div>

      {anyError && <pre className="text-red-600 bg-red-50 p-2 rounded overflow-auto">{JSON.stringify(anyError, null, 2)}</pre>}

      {/* Launch panel */}
      <div className="rounded-md border p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Launch Incident</div>
          {selectedTemplate ? (
            <div className="text-xs opacity-70">
              Template: <span className="font-mono">{selectedTemplate.id}</span> — {selectedTemplate.name}
            </div>
          ) : (
            <div className="text-xs opacity-70">Click “Launch” on a template below</div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm">
            Incident name
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={incidentName}
              onChange={(e) => setIncidentName(e.target.value)}
              disabled={!selectedTemplate || launch.isPending}
              placeholder="Incident name"
            />
          </label>

          <label className="text-sm">
            Description
            <textarea
              className="mt-1 w-full border rounded px-2 py-1"
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              disabled={!selectedTemplate || launch.isPending}
              placeholder="Optional description"
              rows={3}
            />
          </label>

          <div className="flex items-center gap-2">
            <Button onClick={onLaunch} disabled={!selectedTemplate || launch.isPending}>
              {launch.isPending ? 'Launching…' : 'Launch'}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setSelectedTemplate(null);
                setIncidentName('');
                setIncidentDescription('');
              }}
              disabled={launch.isPending}>
              Clear
            </Button>

            {launch.error && <span className="text-sm text-red-600">Launch failed (check console / network response)</span>}
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-medium">Incident Templates</div>
            <div className="text-xs opacity-70">Total: {templates.totalCount}</div>
          </div>
          {templatesPager}
        </div>

        <DataTable data={templatesRows} columns={templateColumns} emptyText="No templates found." />
      </div>

      {/* Incidents */}
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-medium">Incidents</div>
            <div className="text-xs opacity-70">Total: {incidents.totalCount}</div>
          </div>
          {incidentsPager}
        </div>

        <DataTable data={incidentsRows} columns={incidentColumns} emptyText="No incidents found." />
      </div>
    </div>
  );
}
