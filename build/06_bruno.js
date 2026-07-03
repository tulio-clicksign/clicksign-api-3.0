const fs = require('fs');
const path = require('path');

const model = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'requests_model.json'), 'utf8'));

const OUT_DIR = path.join(__dirname, 'out', 'bruno');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim();
}

// bruno.json — collection root config
fs.writeFileSync(
  path.join(OUT_DIR, 'bruno.json'),
  JSON.stringify(
    {
      version: '1',
      name: model.info.name,
      type: 'collection',
      ignore: ['node_modules', '.git'],
    },
    null,
    2
  )
);

// collection.bru — collection-level headers/auth shared by all requests
const collectionBru = `headers {
  Content-Type: application/vnd.api+json
}

auth {
  mode: apikey
}

auth:apikey {
  key: Authorization
  value: {{access_token}}
  placement: header
}
`;
fs.writeFileSync(path.join(OUT_DIR, 'collection.bru'), collectionBru);

// environments
fs.mkdirSync(path.join(OUT_DIR, 'environments'), { recursive: true });

function envBru(name, baseUrl) {
  const lines = [`vars {`, `  base_url: ${baseUrl}`, `  access_token: `];
  for (const v of model.pathVars) lines.push(`  ${v}: `);
  lines.push('}');
  return lines.join('\n') + '\n';
}

fs.writeFileSync(path.join(OUT_DIR, 'environments', 'Sandbox.bru'), envBru('Sandbox', model.baseUrl));
fs.writeFileSync(path.join(OUT_DIR, 'environments', 'Producao.bru'), envBru('Producao', model.productionUrl));

function bruBody(r) {
  if (r.bodyJson === null) return '';
  const json = JSON.stringify(r.bodyJson, null, 2)
    .split('\n')
    .map((l) => '  ' + l)
    .join('\n');
  return `\nbody:json {\n${json}\n}\n`;
}

function bruQueryParams(r) {
  if (!r.queryParams.length) return '';
  const lines = r.queryParams.map((q) => `  ~${q.name}: ${q.value}`);
  return `\nparams:query {\n${lines.join('\n')}\n}\n`;
}

function bruHeaders(r) {
  // Authorization + Content-Type already come from collection.bru; only add
  // headers here if the operation overrides/needs something beyond that.
  const extra = r.headerParams.filter((h) => h.name !== 'Authorization' && h.name !== 'Content-type');
  if (!extra.length) return '';
  const lines = extra.map((h) => `  ${h.name}: ${h.value}`);
  return `\nheaders {\n${lines.join('\n')}\n}\n`;
}

function bruDocs(r) {
  if (!r.description) return '';
  return `\ndocs {\n  ${r.description.replace(/\n/g, '\n  ')}\n}\n`;
}

for (const tag of model.tagOrder) {
  const folderName = sanitizeFileName(tag);
  const folderPath = path.join(OUT_DIR, folderName);
  fs.mkdirSync(folderPath, { recursive: true });

  const reqs = model.requests.filter((r) => r.tag === tag);
  reqs.forEach((r, idx) => {
    const method = r.method.toLowerCase();
    const rawPath = r.path.replace(/\{([^}]+)\}/g, (m, name) => `{{${name}}}`);
    const url = `{{base_url}}${rawPath}`;

    const bru = `meta {
  name: ${r.name}
  type: http
  seq: ${idx + 1}
}

${method} {
  url: ${url}
  body: ${r.bodyJson !== null ? 'json' : 'none'}
  auth: inherit
}
${bruQueryParams(r)}${bruHeaders(r)}${bruBody(r)}${bruDocs(r)}`;

    const fileName = sanitizeFileName(`${r.name}.bru`);
    fs.writeFileSync(path.join(folderPath, fileName), bru);
  });
}

console.log('Bruno collection written to', OUT_DIR);
