import { Controller } from 'react-hook-form';
import { Input } from '../ui/input';
import { FormField } from './FormField';
import { ViewOnlyText } from './ViewOnlyText';
import type { FormInputProps } from '../../types/formInputs';
import { isRequiredFlagSet } from '../../utils/forms';

export const FormInputText = ({ rowId, fieldName, appParams, control, handleChange, hasLabel = true, label, required, value }: FormInputProps) => {
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
        minLength: isRequired
          ? {
              value: 1,
              message: 'Please enter at least one character.',
            }
          : undefined,
      }}
      render={({ field, fieldState }) => (
        <FormField label={resolvedLabel} required={isRequired} error={fieldState.error?.message}>
          <Input
            {...field}
            placeholder="Enter a response"
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
