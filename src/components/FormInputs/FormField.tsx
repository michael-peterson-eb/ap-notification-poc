import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

const cleanLabel = (label?: string) => {
  if (!label) return '';
  return label.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
};

type FormFieldProps = {
  label?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

export const FormField = ({ label, required, error, children }: FormFieldProps) => {
  return (
    <div className="space-y-2">
      {label ? (
        <label className="text-sm font-medium text-gray-900">
          <span dangerouslySetInnerHTML={{ __html: cleanLabel(label) }} />
          {required ? <span className="text-destructive">*</span> : null}
        </label>
      ) : null}

      {children}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
};
