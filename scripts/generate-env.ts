import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.resolve(__dirname, '..', envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const backendUrl = process.env['NG_APP_BACKEND_URL'] || 'http://localhost:8000/api/v1';
const gaMeasurementId = process.env['NG_APP_GA_MEASUREMENT_ID'] || '';

const envContent = `export const environment = {
  production: ${process.env.NODE_ENV === 'production'},
  backendUrl: '${backendUrl}',
  gaMeasurementId: '${gaMeasurementId}'
};
`;

const outputPath = path.resolve(__dirname, '..', 'src', 'environments', 'environment.ts');
fs.writeFileSync(outputPath, envContent);
console.log(`Generated ${outputPath} with backendUrl: ${backendUrl}`);