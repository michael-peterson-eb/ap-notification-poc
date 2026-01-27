import React, { useMemo, useState } from 'react';
import { Button } from 'components/ui/button';
import type { CommTemplateDetail } from 'hooks/comms/list/useCommTemplatesByIds';
import { useCreateContactBuilderSession } from 'hooks/comms/contacts/useCreateContactBuilderSession';
import { useContactBuilderSession } from 'hooks/comms/contacts/useContactBuilderSession';
import { useContactPreview } from 'hooks/comms/contacts/useContactBuilderPreview';

type Props = {
  title: string;
  templateId?: string | null;
  selectedTemplateDetail?: CommTemplateDetail | null;
  isTemplateDetailMissing?: boolean;
  isPending?: boolean; // launch mutation pending
  onCancel: () => void;
  onConfirm: () => void;
  tokenResponse: any;
};

type PreviewContact = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  externalId?: string | null;
  recordTypeName?: string | null;
};

type ContactPreviewResponse = {
  data: PreviewContact[];
  pages?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
};

const RecipientsPanelPreview: React.FC<Props> = ({ title, templateId, selectedTemplateDetail, isTemplateDetailMissing, isPending, onCancel, onConfirm, tokenResponse }) => {
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  // 1) Create a contact builder session
  const createSession = useCreateContactBuilderSession({
    recipients: selectedTemplateDetail?.recipients ?? null,
    tokenResponse,
    autoStart: true,
  });

  // 2) Safe destructure createSession
  const { response: createResponse, isPending: isCreatePending, isSuccess: isCreateSuccess, isError: isCreateError, error: createError } = createSession;
  const sessionId = createResponse?.sessionId ?? null;

  // 3) Poll session status (new hook shape: { status, isLoading, error })
  const {
    status: sessionStatus,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useContactBuilderSession({
    sessionId,
    tokenResponse,
    enabled: Boolean(sessionId), // you may also use Boolean(sessionId) && isCreateSuccess
    intervalMs: 1000,
    maxPolls: 5,
  });

  // Session ready when create succeeded and session is no longer PROCESSING.
  const isProcessing = sessionStatus === 'PROCESSING';
  const isSessionReadyForReads = Boolean(sessionId) && isCreateSuccess && !isSessionLoading && !isProcessing;
  const effectiveSessionId = isSessionReadyForReads ? sessionId : null;

  // 4) Fetch preview once session is ready
  const {
    data: preview,
    isLoading: isLoadingPreview,
    isError: isErrorPreview,
    error: previewError,
  } = useContactPreview({
    sessionId: effectiveSessionId,
    tokenResponse,
    pageSize,
    pageNumber,
    sortBy: 'LASTNAME',
    sortDirection: 'ASC',
    enabled: Boolean(effectiveSessionId),
  }) as {
    data: ContactPreviewResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };

  const previewRows = preview?.data ?? [];
  const totalCount = typeof preview?.pages?.totalCount === 'number' ? preview.pages.totalCount : undefined;
  const totalPages = typeof preview?.pages?.totalPages === 'number' ? preview.pages.totalPages : typeof totalCount === 'number' ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  // Derives error, CTA, etc.
  const hasBlockingRecipientError = Boolean(isCreateError || sessionError || isErrorPreview);

  const isRecipientsLoading =
    !hasBlockingRecipientError &&
    (isCreatePending ||
      isSessionLoading ||
      isProcessing ||
      isLoadingPreview ||
      // also cover the gap where session is created but not yet ready for reads
      (Boolean(sessionId) && !isSessionReadyForReads));

  const primaryCtaLabel = hasBlockingRecipientError ? 'Launch anyway' : isPending ? 'Launching…' : 'Confirm & Launch';

  const canPaginate = Boolean(effectiveSessionId) && !isLoadingPreview && !isErrorPreview && totalPages >= 2;
  const canPrev = canPaginate && pageNumber > 1;
  const canNext = canPaginate && pageNumber < totalPages;

  const detailsErrorText = useMemo(() => {
    if (!hasBlockingRecipientError) return null;

    if (isCreateError && createError) return String(createError);
    if (sessionError) return String(sessionError);
    if (isErrorPreview && previewError) return String(previewError);

    return 'Unable to load full recipient details.';
  }, [hasBlockingRecipientError, isCreateError, createError, sessionError, isErrorPreview, previewError]);

  return (
    <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4">
      <div className="font-semibold text-amber-900">Confirm launch</div>

      <div className="text-sm text-amber-900/80 mt-1">
        You’re about to send <span className="font-medium">{title}</span>using template <span className="font-medium">{selectedTemplateDetail?.name ?? selectedTemplateDetail?.id ?? templateId}</span>.
      </div>

      <div className="mt-3">
        {templateId && isTemplateDetailMissing ? <div className="text-xs text-amber-900/70 mt-2">No recipient details available (template detail not loaded).</div> : null}

        {isRecipientsLoading ? <div className="mt-2 text-xs italic text-amber-900/70">Fetching recipient list… please wait as this can take some time to populate.</div> : null}

        {hasBlockingRecipientError ? (
          <div className="mt-2 text-xs text-red-600">
            Unable to load full recipient details.
            {detailsErrorText ? <div className="mt-1 font-mono break-all">{detailsErrorText}</div> : null}
          </div>
        ) : null}

        {/* Count (from preview response) */}
        {!isRecipientsLoading && typeof totalCount === 'number' ? (
          <div className="mt-3 flex items-baseline gap-2 text-xs text-amber-900/80">
            <div className="font-medium">Recipients</div>
            <div>
              Total: <span className="font-extrabold">{totalCount}</span>
            </div>
          </div>
        ) : null}

        {/* Preview + pagination */}
        <div className="mt-2">
          {effectiveSessionId && !isLoadingPreview && !isErrorPreview ? (
            previewRows.length ? (
              <div className="mt-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-amber-900/70">
                    Showing page <span className="font-mono">{pageNumber}</span> of <span className="font-mono">{totalPages}</span>
                    {typeof totalCount === 'number' ? (
                      <>
                        {' '}
                        · <span className="font-mono">{totalCount}</span> total
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={!canPrev || Boolean(isPending)}>
                      Prev
                    </Button>
                    <Button variant="secondary" onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))} disabled={!canNext || Boolean(isPending)}>
                      Next
                    </Button>
                  </div>
                </div>

                <ul className="mt-2 divide-y divide-amber-200/60 rounded-lg bg-white/60 ring-1 ring-amber-200/50 max-h-56 overflow-auto">
                  {previewRows.map((c) => {
                    const name = [c.lastName, c.firstName].filter(Boolean).join(', ') || '(no name)';
                    const ext = c.externalId ? ` · ${c.externalId}` : '';
                    const type = c.recordTypeName ? ` · ${c.recordTypeName}` : '';
                    return (
                      <li key={c.id} className="px-3 py-2">
                        <div className="text-xs text-amber-950 font-mono">
                          {name}
                          {ext}
                          {type}
                        </div>
                        <div className="text-[11px] text-amber-900/70 font-mono">ID {c.id}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="text-xs text-amber-900/70">No preview recipients returned.</div>
            )
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Button variant="secondary" onClick={onCancel} disabled={Boolean(isPending)}>
          Cancel
        </Button>

        <Button onClick={onConfirm} disabled={Boolean(isPending) || !title}>
          {primaryCtaLabel}
        </Button>
      </div>
    </div>
  );
};

export default RecipientsPanelPreview;
