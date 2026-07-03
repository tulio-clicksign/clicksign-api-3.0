const fs = require('fs');
const path = require('path');

const ops = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'operations.json'), 'utf8'));
const TAG_ORDER = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'tag_order.json'), 'utf8'));

// Groups of operations that share the exact same path+method in reality
// (ReadMe registered them as separate path variants due to differing param
// casing/naming). Merge each group into a single OpenAPI operation using
// oneOf + named examples, keyed by the group's canonical path+method.
const MERGE_GROUPS = [
  {
    path: '/envelopes/{envelope_id}/documents',
    method: 'post',
    slugs: ['api-upload-documentos', 'criar-documento-por-modelo', 'api-duplicar-documento'],
    summary: 'Criar Documento (Upload, por Modelo ou por Duplicação)',
  },
  {
    path: '/envelopes/{envelope_id}/requirements',
    method: 'post',
    slugs: ['criar-requisito-qualificacao', 'criar-requisito-de-autenticacao', 'criar-requisito-de-rubrica'],
    summary: 'Criar Requisito (Qualificação, Autenticação ou Rubrica)',
  },
  {
    path: '/envelopes/{envelope_id}/documents/{document_id}/events',
    method: 'post',
    slugs: ['criar-evento-customizado', 'criar-evento-com-imagem-para-o-documento'],
    summary: 'Criar Evento (Customizado ou com Imagem)',
  },
];

const mergedSlugs = new Set(MERGE_GROUPS.flatMap((g) => g.slugs));
const bySlug = Object.fromEntries(ops.map((o) => [o.slug, o]));

function mergeOperations(group) {
  const variants = group.slugs.map((s) => bySlug[s]);
  const first = variants[0];

  // union of parameters, de-duplicated by name+in
  const paramMap = new Map();
  for (const v of variants) {
    for (const p of v.parameters || []) {
      paramMap.set(`${p.in}:${p.name}`, p);
    }
  }

  // merge requestBody content: same media type across variants expected
  const mediaType = Object.keys(first.requestBody?.content || {})[0] || 'application/vnd.api+json';
  const examples = {};
  const schemas = [];
  for (const v of variants) {
    const content = v.requestBody?.content?.[mediaType];
    if (!content) continue;
    schemas.push(content.schema);
    const vExamples = content.examples || {};
    const exampleEntries = Object.entries(vExamples);
    if (exampleEntries.length > 0) {
      for (const [, exVal] of exampleEntries) {
        examples[v.summary] = { summary: v.summary, value: exVal.value };
      }
    } else {
      examples[v.summary] = { summary: v.summary, value: null };
    }
  }

  // merge responses: union of status codes; merge examples per status code
  const responses = {};
  for (const v of variants) {
    for (const [status, respObj] of Object.entries(v.responses || {})) {
      if (!responses[status]) {
        responses[status] = JSON.parse(JSON.stringify(respObj));
        continue;
      }
      for (const [mt, mtObj] of Object.entries(respObj.content || {})) {
        if (!responses[status].content[mt]) {
          responses[status].content[mt] = mtObj;
          continue;
        }
        Object.assign(responses[status].content[mt].examples || (responses[status].content[mt].examples = {}), mtObj.examples || {});
      }
    }
  }

  const description = [
    `Este endpoint aceita ${variants.length} modos de criação, selecionados pelo formato do corpo da requisição:`,
    ...variants.map((v) => `- **${v.summary}**: ${v.description}`),
  ].join('\n');

  return {
    tag: first.tag,
    method: group.method,
    path: group.path,
    operationId: group.slugs[0],
    summary: group.summary,
    description,
    parameters: [...paramMap.values()],
    requestBody: {
      content: {
        [mediaType]: {
          schema: schemas.length > 1 ? { oneOf: schemas } : schemas[0],
          examples,
        },
      },
    },
    responses,
    'x-clicksign-variants': group.slugs,
  };
}

const finalOps = [
  ...ops.filter((o) => !mergedSlugs.has(o.slug)),
  ...MERGE_GROUPS.map(mergeOperations),
];

function toOasParam(p) {
  const { name, in: loc, description, schema, required } = p;
  const out = { name, in: loc, schema: schema || { type: 'string' } };
  if (description) out.description = description;
  if (required) out.required = true;
  if (loc === 'path') out.required = true;
  return out;
}

function toOasResponses(responses) {
  const out = {};
  for (const [status, r] of Object.entries(responses || {})) {
    out[status] = {
      description: r.description || status,
      content: r.content,
    };
  }
  if (Object.keys(out).length === 0) {
    out['200'] = { description: 'OK' };
  }
  return out;
}

const paths = {};
for (const op of finalOps) {
  paths[op.path] = paths[op.path] || {};
  paths[op.path][op.method] = {
    tags: [op.tag],
    summary: op.summary,
    description: op.description,
    operationId: op.operationId,
    parameters: (op.parameters || [])
      .filter((p) => !['Authorization', 'Content-type'].includes(p.name))
      .map(toOasParam),
    ...(op.requestBody ? { requestBody: { required: true, content: op.requestBody.content } } : {}),
    responses: toOasResponses(op.responses),
    ...(op['x-clicksign-variants'] ? { 'x-clicksign-variants': op['x-clicksign-variants'] } : {}),
  };
}

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Clicksign API v3 (Envelope)',
    version: '3.0',
    description:
      'Especificação OpenAPI 3.0 gerada a partir da documentação pública da Clicksign ' +
      '(https://developers.clicksign.com/reference/comece-agora) para a API 3.0 baseada em Envelope. ' +
      'Autenticação via header `Authorization` com o Access Token gerado no painel Sandbox/Produção. ' +
      'Todas as requisições usam o padrão JSON:API (`Content-type: application/vnd.api+json`).',
    contact: { name: 'Clicksign Developers', url: 'https://developers.clicksign.com' },
  },
  servers: [
    { url: 'https://sandbox.clicksign.com/api/v3', description: 'Sandbox (ambiente de testes)' },
    { url: 'https://app.clicksign.com/api/v3', description: 'Produção — confirme com o time Clicksign antes do go-live' },
  ],
  tags: TAG_ORDER.map((name) => ({ name })),
  security: [{ Authorization: [] }],
  components: {
    securitySchemes: {
      Authorization: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Access Token gerado pelo gestor da conta (enviado sem prefixo "Bearer").',
      },
    },
  },
  paths,
};

fs.writeFileSync(path.join(__dirname, 'out', 'clicksign-envelope-v3.openapi.json'), JSON.stringify(openapi, null, 2));
fs.writeFileSync(path.join(__dirname, 'out', 'final_operations.json'), JSON.stringify(finalOps, null, 2));
console.log('Paths:', Object.keys(paths).length);
console.log('Operations:', finalOps.length);
