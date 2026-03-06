import React, { useMemo, useRef, useState, UIEvent, useEffect } from 'react';

import { DataTable } from 'components/DataTable';
import { useCommsList } from 'hooks/comms/list';
import { params } from 'utils/consts';
import { DateRangePill } from './DateRangePill';
import { ThreadStatusSelect } from './ThreadStatusSelect';
import { SearchByNameInput } from './SearchByNameInput';

const SCROLL_THRESHOLD_PX = 120;
const STORAGE_KEY = `comms-list-state-${params.id}`; // per-plan key

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
  showListView?: boolean;
  onRowPress: (comm: any) => void;
  setActiveTab?: (tab: TabKey) => void;
};

export const CommunicationsListPanel = ({ tokenResponse, permissions, columns, onRowPress }: Props) => {
  // Hydrate from sessionStorage (guarded for SSR)
  let parsed: null | Record<string, any> = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
  }

  // State (visible UI state)
  const [threadStatus, setThreadStatus] = useState<ThreadStatus>(() => parsed?.threadStatus ?? 'ACTIVE');
  const [fromDateStr, setFromDateStr] = useState<string>(() => parsed?.fromDateStr ?? getIsoStartOfDayFromDaysAgo(30));
  const [search, setSearch] = useState<string>(() => parsed?.search ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(() => parsed?.debouncedSearch ?? '');

  // Refs
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // Persist to sessionStorage whenever key pieces of state change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({
        threadStatus,
        fromDateStr,
        search,
        debouncedSearch,
      });
      sessionStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // ignore storage errors
    }
  }, [threadStatus, fromDateStr, search, debouncedSearch]);

  // API filters
  const apiFilters = useMemo(() => {
    const base: Record<string, any> = {
      threadStatus,
      dateType: 'SENT',
      fromDate: fromDateStr,
    };
    const q = debouncedSearch.trim();
    if (q) base.title = q;

    // ALSO include boolean 'active' for endpoints that use that shape.
    // This makes the client compatible with both response shapes while the
    // backend standardizes. If your backend rejects unknown keys, move this
    // mapping into the API client / useCommsList hook instead.
    if (threadStatus === 'ACTIVE') base.active = true;
    else if (threadStatus === 'INACTIVE') base.active = false;

    return base;
  }, [threadStatus, fromDateStr, debouncedSearch]);

  const comms = useCommsList({
    token: tokenResponse,
    planId: params.id,
    pageSize: 10,
    filters: apiFilters,
  }) as any;

  // Normalize rows so downstream code can rely on `threadStatus` always being a string enum
  const normalizedCommsRows = useMemo(() => {
    const rows = comms?.rows ?? [];
    return rows.map((row: Record<string, any>) => {
      // If backend already sends threadStatus, prefer that.
      // Otherwise, if backend sent `active: boolean`, map it to the enum we use in UI.
      let ts = row?.threadStatus;
      if (!ts && typeof row?.active === 'boolean') {
        ts = row.active ? 'ACTIVE' : 'INACTIVE';
      }

      // Some backends may send lowercase or mixed strings: normalize to upper enum
      const normalizedTs = typeof ts === 'string' ? String(ts).toUpperCase() : undefined;

      return {
        ...row,
        threadStatus: normalizedTs,
      };
    });
  }, [comms?.rows]);

  // Use normalized rows throughout
  const commsRows = useMemo(() => normalizedCommsRows, [normalizedCommsRows]);
  const commsFetching = Boolean(comms?.isFetching);
  const hasMore = Boolean(comms?.hasMore);
  const loadMore = comms?.loadMore as undefined | (() => any);

  // Client-side filtering
  const filteredRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const fromMs = (() => {
      const t = Date.parse(fromDateStr);
      return Number.isFinite(t) ? t : undefined;
    })();

    return (commsRows || []).filter((row) => {
      const s = String(row?.threadStatus ?? '').toUpperCase();
      if (s && s !== threadStatus) return false;

      if (fromMs !== undefined) {
        const sentRaw = row?.sent;
        const sentMs = typeof sentRaw === 'string' ? Date.parse(sentRaw) : NaN;
        if (Number.isFinite(sentMs) && sentMs < fromMs) return false;
      }

      if (q) {
        const title = String(row?.title ?? '').toLowerCase();
        if (!title.includes(q)) return false;
      }

      return true;
    });
  }, [commsRows, debouncedSearch, fromDateStr, threadStatus]);

  // Infinite-scroll handler (we do NOT persist scroll position)
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

  // Debounce search input before applying to API / client filtering
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
