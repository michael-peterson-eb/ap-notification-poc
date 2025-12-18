import { formatViewValue } from '../../utils/forms';

type ViewOnlyTextProps = {
  label?: string;
  required?: boolean;
  value?: unknown;
};

export const ViewOnlyText = ({ label, required, value }: ViewOnlyTextProps) => {
  return (
    <div className="space-y-1">
      {label ? (
        <span className="text-sm font-medium text-gray-900">
          {label}
          {required ? <span className="text-destructive">*</span> : null}
        </span>
      ) : null}
      <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-gray-900">{formatViewValue(value)}</div>
    </div>
  );
};
