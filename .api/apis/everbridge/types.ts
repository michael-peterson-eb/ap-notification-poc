import type { FromSchema } from 'json-schema-to-ts';
import * as schemas from './schemas';

export type GenerateTokenFormDataParam = FromSchema<typeof schemas.GenerateToken.formData>;
export type GenerateTokenResponse200 = FromSchema<typeof schemas.GenerateToken.response['200']>;
export type GenerateTokenResponse401 = FromSchema<typeof schemas.GenerateToken.response['401']>;
