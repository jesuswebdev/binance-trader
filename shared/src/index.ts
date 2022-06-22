import { ObjectSchema } from 'joi';

export * from './classes/index';
export * from './constants/index';
export * from './interfaces/index';

export const validateObjectSchema = function validateObjectSchema<T>(
  obj: T,
  schema: ObjectSchema<T>,
) {
  const { value, error } = schema
    .label('Object to validate')
    .options({ stripUnknown: true })
    .validate(obj);

  if (error) {
    throw new Error(error.stack);
  }

  if (!value) {
    throw new Error('Object could not be validated');
  }

  return value;
};
