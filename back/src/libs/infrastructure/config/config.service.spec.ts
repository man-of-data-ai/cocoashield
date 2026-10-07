import { ConfigService } from './config.service';
import { Environment } from './config.schema';

describe('ConfigService.loadConfig', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      NODE_ENV: Environment.TEST,
      APP_NAME: 'cocoashield-back',
      DATABASE_HOST: 'localhost',
      DATABASE_NAME: 'cocoashield',
      DATABASE_USERNAME: 'cocoashield',
      DATABASE_PASSWORD: 'cocoashield',
      BETTER_AUTH_SECRET: 'secret',
      BETTER_AUTH_URL: 'http://localhost:3000',
      REDIS_HOST: 'localhost',
      MODEL_PATH: __filename,
    };
  });

  afterAll(() => {
    process.env = env;
  });

  it('starts when the model file exists', () => {
    expect(() => new ConfigService().loadConfig()).not.toThrow();
  });

  it('refuses to start without MODEL_PATH', () => {
    delete process.env.MODEL_PATH;
    expect(() => new ConfigService().loadConfig()).toThrow(/MODEL_PATH/);
  });

  it('refuses to start when MODEL_PATH points to a missing file', () => {
    process.env.MODEL_PATH = '/nope/absent.onnx';
    expect(() => new ConfigService().loadConfig()).toThrow(
      'MODEL_PATH pointe sur un fichier introuvable : /nope/absent.onnx',
    );
  });
});
