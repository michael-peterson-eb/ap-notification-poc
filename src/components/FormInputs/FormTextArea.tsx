import { Controller } from 'react-hook-form';
import { Textarea } from '../ui/textarea';
import type { FormInputProps } from '../../types/formInputs';
import { isRequiredFlagSet } from '../../utils/forms';
import { FormField } from './FormField';
import { ViewOnlyText } from './ViewOnlyText';

export const FormTextArea = ({ rowId, fieldName, appParams, control, handleChange, hasLabel = true, label, required, value }: FormInputProps) => {
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
              value: 5,
              message: 'Please enter at least 5 characters.',
            }
          : undefined,
      }}
      render={({ field, fieldState }) => (
        <FormField label={resolvedLabel} required={isRequired} error={fieldState.error?.message}>
          <Textarea
            {...field}
            placeholder="Provide as much detail as you can."
            rows={5}
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
