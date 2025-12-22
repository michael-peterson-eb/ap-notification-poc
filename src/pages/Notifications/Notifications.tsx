import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Field, Section, Tabs } from './components';

import { useOrgId } from 'hooks/useOrgId';
import { useIncidentTemplates, IncidentTemplate } from '../../hooks/useIncidentTemplates';
import { useIncidents, Incident } from '../../hooks/useIncidents';
import { useLaunchIncident } from '../../hooks/useLaunchIncident';
import { useComms, Comm } from '../../hooks/useComms';
import { useLaunchComm } from '../../hooks/useLaunchComm';
import { formatDate } from '../../utils/format';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function Notifications({ open, onOpenChange }: Props) {
  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Notifications" widthClassName="max-w-6xl">
      <NotificationsContent />
    </Modal>
  );
}

function NotificationsContent() {
  const { data: ORG_ID } = useOrgId();
  const templates = useIncidentTemplates(ORG_ID);
  const incidents = useIncidents(ORG_ID);
  const launch = useLaunchIncident();
  const comms = useComms({});
  const launchComm = useLaunchComm();

  const [tab, setTab] = useState<'incidents' | 'comms'>('incidents');

  const [launchPayload, setLaunchPayload] = useState<string>(
    JSON.stringify(
      {
        // communicationId: null,
        // title: 'Test launch',
      },
      null,
      2
    )
  );

  const [selectedTemplate, setSelectedTemplate] = useState<IncidentTemplate | null>(null);
  const [incidentName, setIncidentName] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');

  // ✅ Loading/errors split by domain
  const incidentsLoading = templates.isLoading || incidents.isLoading;
  const commsLoading = comms.isLoading;

  const incidentsError = templates.error ?? incidents.error ?? null;
  const commsError = comms.error ?? null;

  const headerLoading = tab === 'incidents' ? incidentsLoading : commsLoading;

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

  const commColumns = useMemo<ColumnDef<Comm>[]>(() => {
    return [
      {
        accessorKey: 'id',
        header: 'Comm ID',
        cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span>,
      },
      { accessorKey: 'title', header: 'Title' },
      { accessorKey: 'eventType', header: 'Event Type' },
      { accessorKey: 'status', header: 'Status' },
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

  const commsPager = (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={comms.prevPage} disabled={comms.pageNumber <= 1}>
        Prev
      </Button>
      <div className="text-xs text-zinc-600">
        Page <strong className="text-zinc-900">{comms.pageNumber}</strong> / <strong className="text-zinc-900">{comms.totalPages}</strong>
      </div>
      <Button variant="secondary" size="sm" onClick={comms.nextPage} disabled={comms.pageNumber >= comms.totalPages}>
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
    <div className="w-full h-full bg-zinc-50">
      <div className="flex flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Notifications</h2>
            <div className="mt-1 text-xs text-zinc-500">Org: {ORG_ID}</div>
          </div>

          <div className="flex items-center gap-3">
            <Tabs tab={tab} onTabChange={setTab} />
            <div className="text-xs text-zinc-500">{headerLoading ? 'Loading…' : templates.idToken ? 'Authenticated' : 'Not authenticated'}</div>
          </div>
        </div>

        {/* ✅ Tab-scoped errors */}
        {tab === 'incidents' && incidentsError ? (
          <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(incidentsError, null, 2)}</pre>
        ) : null}

        {tab === 'comms' && commsError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(commsError, null, 2)}</pre> : null}

        {/* Tabbed content */}
        {tab === 'incidents' ? (
          <>
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
        ) : (
          <>
            {/* Launch Communication */}
            <Section
              title="Launch Communication"
              tone="blue"
              description="Paste the launch request body your tenant expects (start small and iterate)."
              right={launchComm.isPending ? <div className="text-xs text-emerald-700">Launching…</div> : null}>
              <div className="flex flex-col gap-3">
                <textarea
                  className="w-full min-h-[180px] font-mono text-xs p-3 rounded-xl bg-white ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={launchPayload}
                  onChange={(e) => setLaunchPayload(e.target.value)}
                />
                <div className="flex items-start gap-3 flex-wrap">
                  <Button
                    onClick={() => {
                      const body = JSON.parse(launchPayload);
                      launchComm.mutate({ body });
                    }}>
                    Launch
                  </Button>

                  {launchComm.isError ? (
                    <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs max-w-full">{JSON.stringify(launchComm.error, null, 2)}</pre>
                  ) : null}

                  {launchComm.isSuccess ? (
                    <pre className="text-emerald-800 bg-emerald-50 ring-1 ring-emerald-200 p-3 rounded-xl overflow-auto text-xs max-w-full">{JSON.stringify(launchComm.data, null, 2)}</pre>
                  ) : null}
                </div>
              </div>
            </Section>

            {/* Comms table */}
            <Section title="Communications" description={`Total: ${comms.totalCount}`} tone="blue" right={commsPager}>
              <DataTable data={comms.rows} columns={commColumns} emptyText="No communications found." />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
