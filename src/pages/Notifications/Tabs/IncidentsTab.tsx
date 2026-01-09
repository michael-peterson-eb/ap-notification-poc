import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from 'components/ui/button';
import { Field, Section } from '../components';
import { DataTable } from 'components/DataTable';
import { formatDate } from 'utils/format';
import { useOrgId } from 'hooks/useOrgId';
import { useIncidentTemplates, IncidentTemplate } from 'hooks/incidents/useIncidentTemplates';
import { useIncidents, Incident } from 'hooks/incidents/useIncidents';
import { useLaunchIncident } from 'hooks/incidents/useLaunchIncident';

const IncidentsTab = () => {
  const { data: ORG_ID } = useOrgId();
  const templates = useIncidentTemplates(ORG_ID);
  const incidents = useIncidents(ORG_ID);
  const launch = useLaunchIncident();

  const [selectedTemplate, setSelectedTemplate] = useState<IncidentTemplate | null>(null);
  const [incidentName, setIncidentName] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');

  const incidentsError = templates.error ?? incidents.error ?? null;

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
      { id: 'category', header: 'Category', cell: ({ row }) => row.original.category?.name ?? '' },
      { accessorKey: 'templateStatus', header: 'Template Status' },
      { id: 'lastModifiedDate', header: 'Last Modified', cell: ({ row }) => formatDate(row.original.lastModifiedDate) },
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
      { id: 'lastModifiedDate', header: 'Last Modified', cell: ({ row }) => formatDate(row.original.lastModifiedDate) },
    ];
  }, []);

  const templatesRows = templates.rows ?? [];
  const incidentsRows = incidents.rows ?? [];

  const templatesPager = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-600">
        Page <strong className="text-zinc-900">{templates.pageNumber}</strong> of <strong className="text-zinc-900">{templates.totalPages}</strong>
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
      <span className="text-xs text-zinc-600">
        Page <strong className="text-zinc-900">{incidents.pageNumber}</strong> of <strong className="text-zinc-900">{incidents.totalPages}</strong>
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
      incidentAction: 'Launch',
      phaseDefinitionId: 1001,
      name: incidentName || selectedTemplate.name,
    });
  };
  return (
    <>
      {incidentsError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(incidentsError, null, 2)}</pre> : null}

      {/* ✅ Templates ONLY on incidents tab */}
      <Section title="Incident Templates" tone="blue" description={`Total: ${templates.totalCount}`} right={templatesPager}>
        <DataTable data={templatesRows} columns={templateColumns} emptyText="No templates found." />
      </Section>

      {/* Launch Incident */}
      <Section
        title="Launch Incident"
        tone="blue"
        description={selectedTemplate ? undefined : 'Click “Launch” on a template above'}
        right={
          selectedTemplate ? (
            <div className="text-xs text-blue-800/80">
              Template: <span className="font-mono">{selectedTemplate.id}</span> — {selectedTemplate.name}
            </div>
          ) : null
        }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Incident name">
            <input
              className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
              value={incidentName}
              onChange={(e) => setIncidentName(e.target.value)}
              disabled={!selectedTemplate || launch.isPending}
              placeholder="Incident name"
            />
          </Field>

          <Field label="Description" hint="Optional">
            <textarea
              className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              disabled={!selectedTemplate || launch.isPending}
              placeholder="Optional description"
              rows={3}
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
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

          {launch.error ? <span className="text-sm text-red-700">Launch failed (check console / network response)</span> : null}
        </div>
      </Section>

      {/* Incidents table */}
      <Section title="Incidents" description={`Total: ${incidents.totalCount}`} tone="blue" right={incidentsPager}>
        <DataTable data={incidentsRows} columns={incidentColumns} emptyText="No incidents found." />
      </Section>
    </>
  );
};

export default IncidentsTab;
