import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { makeRequest } from 'utils/api';

export type AppType = 'EA_SA_Resource' | 'EA_SA_Dependency';
export type ViewMode = 'view' | 'edit';
export type SectionStatus = 'in-progress' | 'completed';

type DataCtx = {
  appParams: any;
  appSections: { data: any[]; isPending: boolean; error: any };
  currentType: AppType;
  effectiveType: AppType;
  mode: ViewMode;
  originalOpSectionStatus: Record<string, SectionStatus>;
  opSectionStatus: Record<string, SectionStatus>;
  selectedSection: any | null;
  selectedSectionId: string | null;
  setCurrentType: (type: AppType) => void;
  setMode: (mode: ViewMode) => void;
  setOpSectionStatus: React.Dispatch<React.SetStateAction<Record<string, SectionStatus>>>;
  setSelectedSectionId: (id: string | null) => void;
};

const DataContext = createContext<DataCtx>(null as any);

const DataProvider = ({ children, appParams }) => {
  const { id, appTypeIntegrationName, relationshipIntegrationName } = appParams;
  const isDev = process.env.NODE_ENV === 'development';

  // Local type state (used only in dev)
  const [currentType, setCurrentType] = useState<AppType>(appParams.appTypeIntegrationName);
  const [mode, setMode] = useState<ViewMode>('view');

  // In prod, lock to appParams; in dev, allow switching
  const effectiveType: AppType = isDev ? currentType : appTypeIntegrationName;

  const appSections = useQuery({
    queryKey: ['ResourceAndDependencies', id, relationshipIntegrationName, effectiveType],
    queryFn: () =>
      new Promise<any>(async (resolve, reject) => {
        try {
          const request = await makeRequest(
            '_RB.selectQuery',
            ['id', 'name', 'status#code', 'EA_SA_txtCode', 'EA_SA_cbDisplaySection'],
            'EA_SA_OperationsSection',
            `${relationshipIntegrationName}=${id} AND EA_SA_ddlSectionType#code='${effectiveType}' AND EA_SA_cbDisplaySection=1`,
            1000,
            true
          );
          resolve(request);
        } catch (err) {
          reject(err);
        }
      }),
  });

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const selectedSection = appSections?.data?.find((s: any) => s.id === selectedSectionId);

  const [opSectionStatus, setOpSectionStatus] = useState<Record<string, SectionStatus>>({});
  const [originalOpSectionStatus, setOriginalOpSectionStatus] = useState<Record<string, SectionStatus>>({});

  // When sections load/update, seed local status
  useEffect(() => {
    if (!appSections?.data?.length) return;

    const seeded = Object.fromEntries(appSections.data.map((s: any) => [s.id, (s['status'] as SectionStatus) ?? 'in-progress'])) as Record<string, SectionStatus>;
    setOpSectionStatus(seeded);
    setOriginalOpSectionStatus(seeded);
  }, [appSections.data]);

  return (
    <DataContext.Provider
      value={{
        appParams,
        appSections,
        currentType,
        effectiveType,
        mode,
        opSectionStatus,
        originalOpSectionStatus,
        selectedSection,
        selectedSectionId,
        setMode,
        setCurrentType,
        setOpSectionStatus,
        setSelectedSectionId,
      }}>
      {children}
    </DataContext.Provider>
  );
};

const useData = () => {
  const dataContext = useContext(DataContext);

  if (!dataContext) {
    throw new Error('useGlobal must be used within a DataProvider');
  }

  return dataContext;
};

export { DataProvider, useData };
