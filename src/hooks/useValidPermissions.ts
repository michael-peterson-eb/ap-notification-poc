import { useEffect, useState } from 'react';
import type { Permission } from 'utils/permissions';
import { getValidPermissions } from 'utils/permissions';

export function useValidPermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const perms = await getValidPermissions();
        if (!cancelled) setPermissions(Array.isArray(perms) ? perms : []);
      } catch (e) {
        if (!cancelled) {
          setPermissions([]);
          setError(e);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { permissions, isLoading, error };
}
