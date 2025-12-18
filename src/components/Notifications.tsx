import { appParams } from '../utils/appParams';
import { Button } from './ui/button';
import { useData } from 'context/DataContext';
import { useSubmitAll } from '../hooks/useSubmitAll';
import { makeRequest } from 'utils/api';

export default function Notification() {
  const { id, relationshipIntegrationName } = appParams;
  const { appSections, currentType, effectiveType, mode, opSectionStatus, originalOpSectionStatus, selectedSection, selectedSectionId, setCurrentType, setMode, setSelectedSectionId } = useData();

  if (appSections.isPending) return <span>Loading...</span>;
  if (appSections.error) return <span>Oops!</span>;

  return <div className="w-full h-full flex flex-col gap-4 p-4"></div>;
}
