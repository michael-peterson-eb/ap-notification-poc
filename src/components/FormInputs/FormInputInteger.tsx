import { Controller } from 'react-hook-form';
import { Input } from '../ui/input';
import type { FormInputProps } from '../../types/formInputs';
import { isRequiredFlagSet } from '../../utils/forms';
import { FormField } from './FormField';
import { ViewOnlyText } from './ViewOnlyText';

export const FormInputInteger = ({ rowId, fieldName, appParams, control, handleChange, hasLabel = true, label, required, value }: FormInputProps) => {
  const resolvedLabel = hasLabel ? label : undefined;
  const isRequired = isRequiredFlagSet(required);
  const backendValue = value ?? '';
  const { crudAction } = appParams;

  if (crudAction === 'view') {
    return <ViewOnlyText label={resolvedLabel} value={backendValue} required={isRequired} />;
  }

  return (
    <Controller
      name={`${rowId}.${fieldName}`}
      control={control}
      defaultValue={backendValue}
      rules={{
        required: isRequired ? 'This field is required' : false,
        pattern: {
          value: /^[0-9]+$/,
          message: 'Please enter a whole number.',
        },
      }}
      render={({ field, fieldState }) => (
        <FormField label={resolvedLabel} required={isRequired} error={fieldState.error?.message}>
          <Input
            {...field}
            inputMode="numeric"
            type="number"
            placeholder="Enter a whole number"
            onChange={(event) => {
              field.onChange(event);
              handleChange(
                {
                  target: {
                    id: rowId,
                    name: fieldName,
                    value: event.target.value,
                  },
                },
                null,
                {}
              );
            }}
          />
        </FormField>
      )}
    />
  );
};
