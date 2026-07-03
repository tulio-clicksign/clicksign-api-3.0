const fs = require('fs');
const path = require('path');

const model = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'requests_model.json'), 'utf8'));

// Deterministic fake timestamp (workflows can't use Date.now(), and this
// keeps repeated regenerations byte-stable for diffing).
const FIXED_TS = 1751500000000;
let seq = FIXED_TS;
function nextId(prefix) {
  seq += 1;
  return `${prefix}_${seq.toString(36)}`;
}

const WORKSPACE_ID = 'wrk_clicksign_v3';
const BASE_ENV_ID = 'env_base_clicksign';
const SANDBOX_ENV_ID = 'env_sandbox_clicksign';
const PROD_ENV_ID = 'env_prod_clicksign';

function buildUrl(r) {
  const rawPath = r.path.replace(/\{([^}]+)\}/g, (m, name) => `{{ _.${name} }}`);
  return `{{ _.base_url }}${rawPath}`;
}

const resources = [];

resources.push({
  _id: WORKSPACE_ID,
  _type: 'workspace',
  parentId: null,
  name: model.info.name,
  description: model.info.description,
  scope: 'collection',
});

resources.push({
  _id: BASE_ENV_ID,
  _type: 'environment',
  parentId: WORKSPACE_ID,
  name: 'Base Environment',
  data: {
    base_url: model.baseUrl,
    access_token: '',
    ...Object.fromEntries(model.pathVars.map((v) => [v, ''])),
  },
  dataPropertyOrder: null,
  color: null,
  isPrivate: false,
});

resources.push({
  _id: SANDBOX_ENV_ID,
  _type: 'environment',
  parentId: BASE_ENV_ID,
  name: 'Sandbox',
  data: { base_url: model.baseUrl },
  metaSortKey: 1,
  isPrivate: false,
});

resources.push({
  _id: PROD_ENV_ID,
  _type: 'environment',
  parentId: BASE_ENV_ID,
  name: 'Produção',
  data: { base_url: model.productionUrl },
  metaSortKey: 2,
  isPrivate: false,
});

let folderSort = 0;
for (const tag of model.tagOrder) {
  const groupId = nextId('fld');
  folderSort += 1;
  resources.push({
    _id: groupId,
    _type: 'request_group',
    parentId: WORKSPACE_ID,
    name: tag,
    description: '',
    metaSortKey: folderSort,
  });

  const reqs = model.requests.filter((r) => r.tag === tag);
  let reqSort = 0;
  for (const r of reqs) {
    reqSort += 1;
    const headers = r.headerParams.map((h) => ({
      name: h.name,
      value: h.name === 'Authorization' ? '{{ _.access_token }}' : h.value,
      description: h.description,
    }));

    const parameters = r.queryParams.map((q) => ({
      name: q.name,
      value: q.value,
      description: q.description,
      disabled: true,
    }));

    const request = {
      _id: nextId('req'),
      _type: 'request',
      parentId: groupId,
      name: r.name,
      description: r.description,
      method: r.method,
      url: buildUrl(r),
      headers,
      parameters,
      metaSortKey: reqSort,
      settingStoreCookies: true,
      settingSendCookies: true,
    };

    if (r.bodyJson !== null) {
      request.body = {
        mimeType: r.mediaType || 'application/vnd.api+json',
        text: JSON.stringify(r.bodyJson, null, 2),
      };
    } else {
      request.body = {};
    }

    resources.push(request);
  }
}

const exportDoc = {
  _type: 'export',
  __export_format: 4,
  __export_date: '2026-07-03T00:00:00.000Z',
  __export_source: 'clicksign-openapi-generator:v1',
  resources,
};

fs.mkdirSync(path.join(__dirname, 'out', 'insomnia'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, 'out', 'insomnia', 'Clicksign-API-v3-Envelope.insomnia.json'),
  JSON.stringify(exportDoc, null, 2)
);
console.log('Insomnia export written. Resources:', resources.length);
