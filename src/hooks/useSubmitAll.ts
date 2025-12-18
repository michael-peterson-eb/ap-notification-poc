import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type SubmitTask = {
  label: string; // Not really necessary, but useful for logging/errors
  shouldRun?: () => boolean; // Only run if there are changes
  run: () => Promise<unknown>; // The actual submission logic
};

type Params = {
  invalidate: (string | number)[][]; // These are react query keys to invalidate after submission
  allowEmpty?: boolean; // Whether to allow submitting with no tasks to run
};

export function useSubmitAll({ invalidate, allowEmpty = false }: Params) {
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ label: string; error: unknown }[]>([]);

  const submit = useCallback(
    async (tasks: SubmitTask[]) => {
      setIsSubmitting(true);
      setErrors([]);

      const eligible = tasks.filter((t) => (t.shouldRun ? t.shouldRun() : true));

      if (!allowEmpty && eligible.length === 0) {
        setIsSubmitting(false);
        return { ok: true, results: [], errors: [] as const };
      }

      const results = await Promise.allSettled(
        eligible.map(async (t) => {
          await t.run();
          return t.label;
        })
      );

      const errs: { label: string; error: unknown }[] = [];
      results.forEach((r, i) => {
        if (r.status === 'rejected') errs.push({ label: eligible[i].label, error: r.reason });
      });

      // Invalidate on partial or full success (so UI refreshes what succeeded)
      await Promise.all(invalidate.map((key) => qc.invalidateQueries({ queryKey: key, exact: true })));

      setErrors(errs);
      setIsSubmitting(false);

      return {
        ok: errs.length === 0,
        results,
        errors: errs,
      };
    },
    [qc, invalidate, allowEmpty]
  );

  const hasErrors = useMemo(() => errors.length > 0, [errors]);

  return { submit, isSubmitting, errors, hasErrors };
}
