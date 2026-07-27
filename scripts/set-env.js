const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, '../src/environments');

const envConfigFile = `
export const environment = {
  production: false,
  backendUrl: '${process.env.NG_APP_BACKEND_URL || 'http://127.0.0.1:8000/api/v1'}',
  gaMeasurementId: '${process.env.NG_APP_GA_MEASUREMENT_ID || ''}'
};
`;

const prodConfigFile = `
export const environment = {
  production: true,
  backendUrl: '${process.env.NG_APP_BACKEND_URL || 'http://127.0.0.1:8000/api/v1'}',
  gaMeasurementId: '${process.env.NG_APP_GA_MEASUREMENT_ID || ''}'
};
`;

function writeIfChanged(filePath, content, label) {
  let current = '';
  try { current = fs.readFileSync(filePath, 'utf8'); } catch (e) {}
  if (current !== content) {
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
    console.log(`${label} generated at ${filePath}`);
  } else {
    console.log(`${label} is already up-to-date.`);
  }
}

writeIfChanged(path.join(envDir, 'environment.ts'), envConfigFile, 'environment.ts');
writeIfChanged(path.join(envDir, 'environment.prod.ts'), prodConfigFile, 'environment.prod.ts');

// Update angular.json allowedHosts if NG_APP_ALLOWED_HOSTS is provided
if (process.env.NG_APP_ALLOWED_HOSTS) {
  const angularJsonPath = path.join(__dirname, '../angular.json');
  try {
    let angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
    const hosts = process.env.NG_APP_ALLOWED_HOSTS.split(',').map(s => s.trim());
    const buildOptions = angularJson.projects['cycleuni-fe'].architect.build.options;
    if (buildOptions.security) {
      buildOptions.security.allowedHosts = hosts;
      fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2), 'utf8');
      console.log(`Updated angular.json allowedHosts: ${hosts.join(', ')}`);
    }
  } catch (err) {
    console.error('Failed to update angular.json allowedHosts', err);
  }
}
