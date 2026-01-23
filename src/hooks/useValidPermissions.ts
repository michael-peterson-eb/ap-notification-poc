import { useMemo } from 'react';
import { getValidPermissions, type Permission } from 'utils/permissions';

export function useValidPermissions(): Permission[] {
  return useMemo(() => getValidPermissions(), []);
}
