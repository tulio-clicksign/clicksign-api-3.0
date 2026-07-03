const fs = require('fs');
const path = require('path');

const model = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'requests_model.json'), 'utf8'));

function buildUrl(r) {
  const rawPath = r.path.replace(/\{([^}]+)\}/g, (m, name) => `{{${name}}}`);
  const pathSegments = rawPath.split('/').filter(Boolean);
  const query = r.queryParams.map((q) => ({
    key: q.name,
    value: q.value,
    description: q.description,
    disabled: true,
  }));
  return {
    raw: `{{base_url}}${rawPath}${query.length ? '?' + query.map((q) => `${q.key}=${q.value}`).join('&') : ''}`,
    host: ['{{base_url}}'],
    path: pathSegments,
    query,
  };
}

function buildItem(r) {
  const headers = r.headerParams.map((h) => ({
    key: h.name,
    value: h.value,
    description: h.description,
    type: 'text',
  }));

  const item = {
    name: r.name,
    request: {
      method: r.method,
      header: headers,
      url: buildUrl(r),
      description: r.description,
    },
    response: [],
  };

  if (r.bodyJson !== null) {
    item.request.body = {
      mode: 'raw',
      raw: JSON.stringify(r.bodyJson, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  return item;
}

const folders = model.tagOrder.map((tag) => ({
  name: tag,
  item: model.requests.filter((r) => r.tag === tag).map(buildItem),
}));

const collection = {
  info: {
    _postman_id: 'clicksign-api-v3-envelope',
    name: model.info.name,
    description: model.info.description,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: folders,
  auth: {
    type: 'apikey',
    apikey: [
      { key: 'key', value: 'Authorization', type: 'string' },
      { key: 'value', value: '{{access_token}}', type: 'string' },
      { key: 'in', value: 'header', type: 'string' },
    ],
  },
  variable: [
    { key: 'base_url', value: model.baseUrl, type: 'string' },
    { key: 'access_token', value: '', type: 'string' },
    ...model.pathVars.map((v) => ({ key: v, value: '', type: 'string' })),
  ],
};

fs.mkdirSync(path.join(__dirname, 'out', 'postman'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, 'out', 'postman', 'Clicksign-API-v3-Envelope.postman_collection.json'),
  JSON.stringify(collection, null, 2)
);

const sandboxEnv = {
  id: 'clicksign-sandbox-env',
  name: 'Clicksign - Sandbox',
  values: [
    { key: 'base_url', value: model.baseUrl, enabled: true },
    { key: 'access_token', value: '', enabled: true },
    ...model.pathVars.map((v) => ({ key: v, value: '', enabled: true })),
  ],
  _postman_variable_scope: 'environment',
};

const productionEnv = {
  id: 'clicksign-production-env',
  name: 'Clicksign - Produção',
  values: [
    { key: 'base_url', value: model.productionUrl, enabled: true },
    { key: 'access_token', value: '', enabled: true },
    ...model.pathVars.map((v) => ({ key: v, value: '', enabled: true })),
  ],
  _postman_variable_scope: 'environment',
};

fs.writeFileSync(path.join(__dirname, 'out', 'postman', 'Clicksign-Sandbox.postman_environment.json'), JSON.stringify(sandboxEnv, null, 2));
fs.writeFileSync(path.join(__dirname, 'out', 'postman', 'Clicksign-Producao.postman_environment.json'), JSON.stringify(productionEnv, null, 2));

console.log('Postman collection + environments written.');
