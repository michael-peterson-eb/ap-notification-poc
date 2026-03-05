import { useCommActivities } from 'hooks/comms/details/useCommActivities';
import ActivityRowOrCard from './ActivitiesCard';

type Props = {
  confirmation: any;
  comm: any;
  commId: string;
  token: any; // tokenResponse
  pageSize?: number; // default 100
};

export function ActivitiesPanel({ confirmation, comm, commId, token, pageSize = 100 }: Props) {
  const activities = useCommActivities(commId, { token, pageSize, enabled: !!commId });
  const rows = activities.rows;

  const ActivitiesError = () => {
    if (activities.error) {
      const err: any = activities.error;
      const status = err?.status ?? err?.response?.status ?? err?.originalStatus;
      const is404 = status === 404;
      const is504 = status === 504;
      if (is404) {
        return (
          <div className="bg-amber-50 ring-1 ring-amber-200 p-3 rounded-xl text-sm text-amber-900">
            <div className="font-medium">We couldn’t find confirmation data yet.</div>
            <div className="mt-1 text-amber-800">If you just created this communication, it can take a few seconds to become available. Please wait a moment and refresh.</div>
          </div>
        );
      }

      if (is504) {
        return (
          <div className="bg-red-50 ring-1 ring-red-200 p-3 rounded-xl text-sm text-red-900">
            <div className="font-medium">Gateway Timeout</div>
            <div className="mt-1 text-red-800">The server took too long to respond. Please try again later.</div>
          </div>
        );
      }
      return <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(activities.error, null, 2)}</pre>;
    } else {
      return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex h-full flex-col rounded-xl bg-[linear-gradient(0deg,rgba(29,100,232,0.01)_0%,rgba(29,100,232,0.01)_100%),linear-gradient(180deg,#FFF_0%,#FDFDFD_100%)] shadow-[0_4px_8px_0_rgba(0,0,0,0.08),0_6px_30px_-4px_rgba(29,100,232,0.25)]">
        <div className="flex-none border-b border-[#76A5FF] px-8 py-4">
          <span className="text-xl font-normal text-[#13151C]">Activity</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto min-h-0">
          {activities.error && (
            <div className="p-8">
              <ActivitiesError />
            </div>
          )}

          {activities?.isLoading && <div className="p-8">Loading activities…</div>}

          {!activities?.isLoading && !activities?.error && (
            <div className="flex px-8 gap-8">
              <div className="pb-8">
                {rows.map((activity, idx) => (
                  <ActivityRowOrCard key={`${commId}-${activity.createdAt}`} activity={activity} comm={comm} recipientCount={confirmation.data?.totalCount ?? 0} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
