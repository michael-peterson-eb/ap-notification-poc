import { useMemo, useRef, useState, UIEvent, useEffect } from 'react';

import { DataTable } from 'components/DataTable';
import { useCommsList } from 'hooks/comms/list';
import { params } from 'utils/consts';
import { DateRangePill } from './DateRangePill';
import { ThreadStatusSelect } from './ThreadStatusSelect';
import { SearchByNameInput } from './SearchByNameInput';

const SCROLL_THRESHOLD_PX = 120;

type ThreadStatus = 'ACTIVE' | 'INACTIVE';
type TabKey = 'launch' | 'list' | 'settings';

function getIsoStartOfDayFromDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

type Props = {
  tokenResponse: any;
  permissions?: string[];
  columns: any;
  showListView: boolean;
  onRowPress: (comm: any) => void;
  setActiveTab: (tab: TabKey) => void;
};

const CommunicationsListPanel = ({ tokenResponse, permissions, columns, onRowPress, setActiveTab }: Props) => {
  const [threadStatus, setThreadStatus] = useState<ThreadStatus>('ACTIVE');
  const [fromDateStr, setFromDateStr] = useState<string>(() => getIsoStartOfDayFromDaysAgo(7));
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // These filters are still passed through:
  // - dev/standalone: server-side filters in useComms
  // - prod/by-ids: used as resetKey inside useCommsByIds (and we still client-filter rows)
  const apiFilters = useMemo(() => {
    const base: Record<string, any> = {
      threadStatus,
      dateType: 'SENT',
      fromDate: fromDateStr,
    };
    const q = debouncedSearch.trim();
    if (q) base.title = q;
    return base;
  }, [threadStatus, fromDateStr, debouncedSearch]);

  const comms = useCommsList({
    token: tokenResponse,
    planId: params.id,
    pageSize: 10,
    filters: apiFilters,
  }) as any;

  const commsRows = useMemo(() => comms?.rows, [comms?.rows]);
  const commsFetching = Boolean(comms?.isFetching);
  const hasMore = Boolean(comms?.hasMore);
  const loadMore = comms?.loadMore as undefined | (() => any);

  // Client-side filtering (required for prod/by-ids; harmless in dev)
  const filteredRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const fromMs = (() => {
      const t = Date.parse(fromDateStr);
      return Number.isFinite(t) ? t : undefined;
    })();

    return commsRows.filter((row) => {
      // Status
      const s = String(row?.threadStatus ?? '').toUpperCase();
      if (s && s !== threadStatus) return false;

      // Date window (sent is ISO Z stamp)
      if (fromMs !== undefined) {
        const sentRaw = row?.sent;
        const sentMs = typeof sentRaw === 'string' ? Date.parse(sentRaw) : NaN;
        if (Number.isFinite(sentMs) && sentMs < fromMs) return false;
      }

      // Search by title
      if (q) {
        const title = String(row?.title ?? '').toLowerCase();
        if (!title.includes(q)) return false;
      }

      return true;
    });
  }, [commsRows, debouncedSearch, fromDateStr, threadStatus]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    if (!hasMore) return;
    if (commsFetching) return;
    if (loadingMoreRef.current) return;
    if (!loadMore) return;

    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX) {
      loadingMoreRef.current = true;

      const p = loadMore();
      if (p && typeof (p as any).finally === 'function') {
        (p as any).finally(() => (loadingMoreRef.current = false));
      } else {
        loadingMoreRef.current = false;
      }
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    loadingMoreRef.current = false;
  }, [threadStatus, fromDateStr, debouncedSearch]);

  if (!permissions?.includes('bc.comms.list')) return null;

  return (
    <div className="px-1">
      <div className="mb-3 flex items-center justify-between gap-3 flex-nowrap">
        {/* Left */}
        <div className="flex items-center gap-2 flex-nowrap min-w-0">
          <ThreadStatusSelect value={threadStatus} onChange={setThreadStatus} />
          <DateRangePill dateValue={fromDateStr} onDateChange={(d) => setFromDateStr(d)} ariaLabel="Communications date range" />
        </div>

        {/* Right */}
        <div className="flex items-center justify-end flex-nowrap min-w-0 flex-1">
          <SearchByNameInput value={search} onChange={setSearch} className="w-full justify-end" />
        </div>
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        emptyText="No communications found."
        heightClassName="h-[440px]"
        onScroll={handleScroll}
        scrollRef={scrollRef}
        onRowPress={onRowPress}
        footer={
          <>
            {commsFetching ? <div className="py-3 text-center text-xs text-zinc-500">Loading…</div> : null}
            {!hasMore && filteredRows.length > 0 ? <div className="py-3 text-center text-xs text-zinc-500">All communications loaded</div> : null}
          </>
        }
      />
    </div>
  );
};

export default CommunicationsListPanel;
