import { PreviewMessages } from '../LaunchComm/VariableFields/PreviewMessage';
import { useCommContents } from 'hooks/comms/details/useCommContents';

type Comm = {
  commId: string;
  contentMetadata?: { paths?: { language?: string; pathCategory?: string; contentUri: string }[] };
};

export default function MessagePanel({ comm, token, variables = [], valuesById = {} }: { comm?: Comm; token?: any; variables?: any[]; valuesById?: Record<string, any> }) {
  const paths = comm?.contentMetadata?.paths;
  const { contents, isLoading, error: messageError } = useCommContents(paths, token, { enabled: !!comm?.commId });

  const MessageError = () => {
    if (messageError) {
      const err: any = messageError;
      const status = err?.status ?? err?.response?.status ?? err?.originalStatus;
      const is404 = status === 404;
      const is504 = status === 504;
      if (is404) {
        return (
          <div className="p-8">
            <div className="bg-amber-50 ring-1 ring-amber-200 p-3 rounded-xl text-sm text-amber-900">
              <div className="font-medium">We couldn’t find confirmation data yet.</div>
              <div className="mt-1 text-amber-800">If you just created this communication, it can take a few seconds to become available. Please wait a moment and refresh.</div>
            </div>
          </div>
        );
      }

      if (is504) {
        return (
          <div className="p-8">
            <div className="bg-red-50 ring-1 ring-red-200 p-3 rounded-xl text-sm text-red-900">
              <div className="font-medium">Gateway Timeout</div>
              <div className="mt-1 text-red-800">The server took too long to respond. Please try again later.</div>
            </div>
          </div>
        );
      }

      return (
        <div className="p-8">
          <div className="bg-red-50 ring-1 ring-red-200 p-3 rounded-xl text-sm text-red-900">
            <div className="font-medium">An error occurred</div>
            <div className="mt-1 text-red-800">{err?.detail}</div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  };

  return (
    <div className="rounded-xl bg-[linear-gradient(0deg,rgba(29,100,232,0.01)_0%,rgba(29,100,232,0.01)_100%),linear-gradient(180deg,#FFF_0%,#FDFDFD_100%)] shadow-[0_4px_8px_0_rgba(0,0,0,0.08),0_6px_30px_-4px_rgba(29,100,232,0.25)]">
      <div className="border-b border-[#76A5FF] px-8 py-4">
        <span className="text-xl font-normal text-[#13151C]">Message</span>
      </div>

      {isLoading && <div className="text-sm text-zinc-600">Loading message content…</div>}
      <MessageError />
      {!isLoading && !messageError && contents.length === 0 && <div className="text-sm text-zinc-500">No message content available</div>}

      {!isLoading && !messageError && contents.length > 0 && <PreviewMessages contents={contents} variables={variables} valuesById={valuesById} showPreviewHeader={false} />}
    </div>
  );
}
