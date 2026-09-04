const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, '../src/environments');

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

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

function writeFile(filePath, content, label) {
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  console.log(`${label} generated at ${filePath}`);
}

writeFile(path.join(envDir, 'environment.ts'), envConfigFile, 'environment.ts');
writeFile(path.join(envDir, 'environment.prod.ts'), prodConfigFile, 'environment.prod.ts');

// Update angular.json allowedHosts if NG_APP_ALLOWED_HOSTS is provided
if (process.env.NG_APP_ALLOWED_HOSTS) {
  const angularJsonPath = path.join(__dirname, '../angular.json');
  try {
    let angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
    const hosts = process.env.NG_APP_ALLOWED_HOSTS.split(',').map(s => s.trim());
    const buildOptions = angularJson.projects['unibooks-fe'].architect.build.options;
    if (buildOptions.security) {
      buildOptions.security.allowedHosts = hosts;
      fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2), 'utf8');
      console.log(`Updated angular.json allowedHosts: ${hosts.join(', ')}`);
    }
  } catch (err) {
    console.error('Failed to update angular.json allowedHosts', err);
  }
}

// ---------------------------------------------------------------------------
// Content-Security-Policy
//
// The policy shipped in public/_headers is Report-Only and names two wildcard
// sources (img-src https:, connect-src https: wss:), because the R2 media
// domain and the CFEdgeChat origin differ per deployment and a static file
// cannot know them. A wildcard connect-src is most of the value of a CSP gone:
// it is exactly the directive that would stop an injected script posting
// stolen data to an attacker's server.
//
// So narrow it here, from the same environment that configures the app. When
// the origins below are supplied the CSP line is rewritten with real hosts,
// and NG_APP_CSP_ENFORCE=1 additionally promotes it from Report-Only to
// enforcing. With none of them set the committed file is left exactly as it
// is — a deploy that does not opt in keeps working, with every other security
// header intact.
// ---------------------------------------------------------------------------

function originOf(rawUrl) {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).origin;
  } catch {
    console.warn(`[set-env] ignoring unparseable URL for CSP: ${rawUrl}`);
    return null;
  }
}

function buildCsp({ backendOrigin, chatOrigin, mediaOrigin }) {
  const connect = ["'self'", backendOrigin, chatOrigin, chatOrigin && chatOrigin.replace(/^https:/, 'wss:')];
  const img = ["'self'", 'data:', 'blob:', mediaOrigin, 'https://lh3.googleusercontent.com'];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' https://accounts.google.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src ${img.filter(Boolean).join(' ')}`,
    `connect-src ${connect.filter(Boolean).join(' ')}`,
    'frame-src https://accounts.google.com',
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; ');
}

const cspOrigins = {
  backendOrigin: originOf(process.env.NG_APP_BACKEND_URL),
  chatOrigin: originOf(process.env.NG_APP_EDGE_CHAT_URL),
  mediaOrigin: originOf(process.env.NG_APP_MEDIA_URL),
};

// Only rewrite once every origin the wildcards stand in for is known.
// Substituting a partial set would narrow the policy to something the app
// cannot actually run under.
if (cspOrigins.backendOrigin && cspOrigins.chatOrigin && cspOrigins.mediaOrigin) {
  const headersPath = path.join(__dirname, '../public/_headers');
  const headerName = process.env.NG_APP_CSP_ENFORCE === '1'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';
  const line = `  ${headerName}: ${buildCsp(cspOrigins)}`;

  const original = fs.readFileSync(headersPath, 'utf8');
  const rewritten = original.replace(
    /^ {2}Content-Security-Policy(-Report-Only)?:.*$/m,
    line.replace(/\$/g, '$$$$'),
  );

  if (rewritten === original) {
    console.log('CSP unchanged');
  } else {
    fs.writeFileSync(headersPath, rewritten, { encoding: 'utf8' });
    console.log(`CSP rewritten in public/_headers (${headerName})`);
  }
} else {
  console.log('CSP left as committed — set NG_APP_BACKEND_URL, NG_APP_EDGE_CHAT_URL and NG_APP_MEDIA_URL to narrow it');
}
