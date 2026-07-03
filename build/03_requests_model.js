const fs = require('fs');
const path = require('path');

const ops = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'operations.json'), 'utf8'));
const TAG_ORDER = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'tag_order.json'), 'utf8'));

function schemaToExample(schema) {
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length) return schema.enum[0];
  if (schema.oneOf) return schemaToExample(schema.oneOf[0]);
  switch (schema.type) {
    case 'object': {
      const obj = {};
      for (const [k, v] of Object.entries(schema.properties || {})) obj[k] = schemaToExample(v);
      return obj;
    }
    case 'array':
      return [schemaToExample(schema.items || {})];
    case 'string':
      return '';
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return null;
  }
}

function pathVarsOf(canonicalPath) {
  return [...canonicalPath.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

const requests = ops.map((op) => {
  const pathVars = pathVarsOf(op.path);
  const headerParams = (op.parameters || []).filter((p) => p.in === 'header');
  const queryParams = (op.parameters || []).filter((p) => p.in === 'query');

  let bodyJson = null;
  let mediaType = null;
  if (op.requestBody) {
    mediaType = Object.keys(op.requestBody.content)[0];
    bodyJson = schemaToExample(op.requestBody.content[mediaType].schema);
  }

  return {
    slug: op.slug,
    tag: op.tag,
    name: op.summary,
    description: op.description,
    method: op.method.toUpperCase(),
    path: op.path, // e.g. /envelopes/{envelope_id}/documents
    pathVars,
    headerParams: headerParams.map((h) => ({
      name: h.name,
      value: h.name === 'Authorization' ? '{{access_token}}' : (h.schema?.default || h.schema?.enum?.[0] || ''),
      description: h.description || '',
    })),
    queryParams: queryParams.map((q) => ({
      name: q.name,
      value: '',
      description: q.description || '',
      required: !!q.required,
    })),
    mediaType,
    bodyJson,
  };
});

// distinct path variable names, in first-seen order
const allPathVars = [];
for (const r of requests) {
  for (const v of r.pathVars) if (!allPathVars.includes(v)) allPathVars.push(v);
}

const model = {
  info: {
    name: 'Clicksign API v3 (Envelope)',
    description:
      'Coleção gerada a partir da documentação pública da Clicksign (https://developers.clicksign.com/reference/comece-agora). ' +
      'Autenticação via header Authorization com o Access Token (sem prefixo Bearer). Content-Type padrão: application/vnd.api+json.',
  },
  baseUrl: 'https://sandbox.clicksign.com/api/v3',
  productionUrl: 'https://app.clicksign.com/api/v3',
  tagOrder: TAG_ORDER,
  pathVars: allPathVars,
  requests,
};

fs.writeFileSync(path.join(__dirname, 'out', 'requests_model.json'), JSON.stringify(model, null, 2));
console.log('requests:', requests.length, 'pathVars:', allPathVars);
