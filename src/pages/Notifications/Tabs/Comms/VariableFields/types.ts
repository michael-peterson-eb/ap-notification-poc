export type TemplateVariable = {
  variableId: string | number;
  value?: any;
  required?: boolean;
  permission?: string | null;
  type?: string | null;
};

export type SelectionOption = {
  label: string;
  value: string;
};

export type VariableType = 'single-select' | 'multi-select' | 'textbox' | 'textarea' | 'date';

export type CommVariableDef = {
  id: string;
  name?: string;
  title?: string;
  displayName?: string;
  variableType?: string;
  tooltip?: string;
  description?: string;
  properties?: Array<{ type?: string; value?: any }>;
  [k: string]: any;
};

export type ValidationResult = {
  ok: boolean;
  messages: string[];
  contextVariables?: Array<{ variableId: string; value: string | string[] }>;
};

export type VariableFieldsProps = {
  templateVariables: TemplateVariable[] | undefined | null;
  templateId: string;
  tokenResponse: any;
  selections?: SelectionOption[];
  disabled?: boolean;
};

export type VariableFieldsHandle = {
  validate: () => Promise<ValidationResult>;
};
