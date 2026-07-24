const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/environments/environment.ts');

const envConfigFile = `
export const environment = {
  production: false,
  backendUrl: '${process.env.NG_APP_BACKEND_URL || 'http://127.0.0.1:8000/api/v1'}',
  gaMeasurementId: '${process.env.NG_APP_GA_MEASUREMENT_ID || ''}'
};
`;

let currentContent = '';
try {
  currentContent = fs.readFileSync(targetPath, 'utf8');
} catch (e) {}

if (currentContent !== envConfigFile) {
  fs.writeFileSync(targetPath, envConfigFile, { encoding: 'utf8' });
  console.log(`Output generated at ${targetPath}`);
} else {
  console.log(`Environment file is already up-to-date.`);
}

// Update angular.json allowedHosts if NG_APP_ALLOWED_HOSTS is provided
if (process.env.NG_APP_ALLOWED_HOSTS) {
  const angularJsonPath = path.join(__dirname, '../angular.json');
  try {
    let angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
    const hosts = process.env.NG_APP_ALLOWED_HOSTS.split(',').map(s => s.trim());
    
    if (angularJson.projects['cycleuni-fe'].architect.build.options.security) {
      angularJson.projects['cycleuni-fe'].architect.build.options.security.allowedHosts = hosts;
      fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2), 'utf8');
      console.log(`Updated angular.json allowedHosts from NG_APP_ALLOWED_HOSTS: ${hosts.join(', ')}`);
    }
  } catch (err) {
    console.error('Failed to update angular.json allowedHosts', err);
  }
}
