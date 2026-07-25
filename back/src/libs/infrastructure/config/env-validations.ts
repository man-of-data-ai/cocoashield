import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ConfigSchema } from './config.schema';

export function validate(
  config: Record<string, unknown>,
  klass: ClassConstructor<ConfigSchema>,
): ConfigSchema {
  const validatedConfig = plainToInstance(klass, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
