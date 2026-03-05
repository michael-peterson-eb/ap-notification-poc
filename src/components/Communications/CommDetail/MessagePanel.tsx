import { PreviewMessages } from '../LaunchComm/VariableFields/PreviewMessage';
import { useCommContents } from 'hooks/comms/details/useCommContents';

type Comm = {
  commId: string;
  contentMetadata?: { paths?: { language?: string; pathCategory?: string; contentUri: string }[] };
};

export default function MessagePanel({ comm, token, variables = [], valuesById = {} }: { comm?: Comm; token?: any; variables?: any[]; valuesById?: Record<string, any> }) {
  const paths = comm?.contentMetadata?.paths;
  const { contents, isLoading, error } = useCommContents(paths, token, { enabled: !!comm?.commId });

  return (
    <div className="rounded-xl bg-[linear-gradient(0deg,rgba(29,100,232,0.01)_0%,rgba(29,100,232,0.01)_100%),linear-gradient(180deg,#FFF_0%,#FDFDFD_100%)] shadow-[0_4px_8px_0_rgba(0,0,0,0.08),0_6px_30px_-4px_rgba(29,100,232,0.25)]">
      <div className="border-b border-[#76A5FF] px-8 py-4">
        <span className="text-xl font-normal text-[#13151C]">Message</span>
      </div>

      {isLoading && <div className="text-sm text-zinc-600">Loading message content…</div>}
      {error && <div className="text-sm text-red-600">Error loading content: {String(error.message)}</div>}
      {!isLoading && !error && contents.length === 0 && <div className="text-sm text-zinc-500">No message content available</div>}

      {!isLoading && !error && contents.length > 0 && <PreviewMessages contents={contents} variables={variables} valuesById={valuesById} />}
    </div>
  );
}
