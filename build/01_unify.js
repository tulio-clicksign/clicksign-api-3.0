const fs = require('fs');
const path = require('path');

const TEMP = 'C:/Users/TULIO~1.FRE/AppData/Local/Temp';
const schema = JSON.parse(fs.readFileSync(`${TEMP}/full_schema.json`, 'utf8'));
const matched = JSON.parse(fs.readFileSync(`${TEMP}/matched.json`, 'utf8'));

const TAGS = {
  'api-criar-envelope': 'Envelope',
  'api-listar-envelopes': 'Envelope',
  'api-editar-envelope': 'Envelope',
  'api-detalhes-do-envelope': 'Envelope',
  'api-excluir-envelope': 'Envelope',

  'api-listar-documentos': 'Documentos',
  'api-upload-documentos': 'Documentos',
  'criar-documento-por-modelo': 'Documentos',
  'api-duplicar-documento': 'Documentos',
  'editar-documento': 'Documentos',
  'detalhes-do-documento': 'Documentos',
  'api-excluir-documento': 'Documentos',

  'api-listar-signatarios': 'Signatários',
  'api-criar-signatario': 'Signatários',
  'api-detalhes-do-signatario': 'Signatários',
  'api-excluir-signatario': 'Signatários',

  'api-listar-requisitos': 'Requisitos',
  'criar-requisito-qualificacao': 'Requisitos',
  'criar-requisito-de-autenticacao': 'Requisitos',
  'criar-requisito-de-rubrica': 'Requisitos',
  'detalhes-do-requisito': 'Requisitos',
  'api-excluir-requisito': 'Requisitos',

  'api-listar-observadores': 'Observadores de Assinaturas',
  'api-criar-observadores': 'Observadores de Assinaturas',
  'api-excluir-observador': 'Observadores de Assinaturas',

  'api-notificar-signatario': 'Notificações',
  'api-notificar-envelope': 'Notificações',

  'eventos-de-um-documento': 'Eventos',
  'criar-evento-customizado': 'Eventos',
  'criar-evento-com-imagem-para-o-documento': 'Eventos',

  'api-listar-webhooks': 'Webhooks',
  'api-criar-webhook': 'Webhooks',
  'api-detalhes-do-webhook': 'Webhooks',
  'api-editar-webhook': 'Webhooks',
  'api-excluir-webhook': 'Webhooks',

  'api-listar-modelos': 'Modelos',
  'api-criar-modelo': 'Modelos',
  'api-editar-modelo': 'Modelos',
  'api-visualizar-modelo': 'Modelos',
  'api-excluir-modelo': 'Modelos',

  'bulk-requirements': 'Operações de Requisitos em Massa',

  'api-listar-pastas': 'Pastas',
  'criar-pasta': 'Pastas',
  'api-detalhes-da-pasta': 'Pastas',

  'api-criar-termo': 'Termo Assinatura Automática',

  'api-listar-usuarios': 'Usuários',
  'api-criar-usuario': 'Usuários',
  'api-detalhes-usuario': 'Usuários',

  'api-listar-membros': 'Membros',
  'api-criar-membro': 'Membros',
  'api-editar-membro': 'Membros',
  'api-deletar-membro': 'Membros',

  'api-listar-aceites-via-whatsapp': 'Aceite por WhatsApp',
  'api-criar-aceite-whatsapp': 'Aceite por WhatsApp',
  'visualizar-um-aceite-via-whatsapp': 'Aceite por WhatsApp',
  'editar-um-aceite-via-whatsapp': 'Aceite por WhatsApp',
};

const TAG_ORDER = [
  'Envelope', 'Documentos', 'Signatários', 'Requisitos',
  'Observadores de Assinaturas', 'Notificações', 'Eventos', 'Webhooks',
  'Modelos', 'Operações de Requisitos em Massa', 'Pastas',
  'Termo Assinatura Automática', 'Usuários', 'Membros', 'Aceite por WhatsApp',
];

// Canonical path-param renames: raw name (any case/variant) -> canonical name
const PARAM_RENAMES = {
  envelopeid: 'envelope_id',
  envelopeID: 'envelope_id',
  envelope_id: 'envelope_id',
  id_do_envelope: 'envelope_id',
  documentid: 'document_id',
  document_id: 'document_id',
  webhook_id: 'webhook_id',
  webhookid: 'webhook_id',
  id: 'webhook_id', // only used in /webhooks/{id} delete context
  aceite_id: 'acceptance_term_id',
  acceptance_term_id: 'acceptance_term_id',
};

function canonicalizePath(p, methodContext) {
  let clean = p.trim();
  // special-case the lone 'id' param used only for webhooks delete path
  if (/^\/webhooks\/\{id\}$/.test(clean)) return '/webhooks/{webhook_id}';
  clean = clean.replace(/\{([^}]+)\}/g, (m, name) => {
    const renamed = PARAM_RENAMES[name] || name;
    return `{${renamed}}`;
  });
  return clean;
}

function renameParamsInList(params, rawPath) {
  return (params || []).map((p) => {
    if (p.in !== 'path') return p;
    let newName = PARAM_RENAMES[p.name] || p.name;
    if (/^\/webhooks\/\{id\}$/.test(rawPath.trim()) && p.name === 'id') newName = 'webhook_id';
    return { ...p, name: newName };
  });
}

const ops = matched.map(({ meta, rawPath, op }) => {
  const canonicalPath = canonicalizePath(rawPath);
  const method = meta.method.toLowerCase() === 'del' ? 'delete' : meta.method.toLowerCase();
  return {
    slug: meta.slug,
    tag: TAGS[meta.slug] || 'Outros',
    method,
    rawPath,
    path: canonicalPath,
    operationId: meta.slug,
    summary: meta.title,
    description: op.description || meta.excerpt || meta.title,
    parameters: renameParamsInList(op.parameters, rawPath),
    requestBody: op.requestBody || null,
    responses: op.responses || {},
  };
});

if (ops.some((o) => !TAGS[o.slug])) {
  console.error('Missing tag mapping for:', ops.filter((o) => !TAGS[o.slug]).map((o) => o.slug));
  process.exit(1);
}

fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'operations.json'), JSON.stringify(ops, null, 2));
fs.writeFileSync(path.join(__dirname, 'out', 'tag_order.json'), JSON.stringify(TAG_ORDER, null, 2));
console.log('Total operations:', ops.length);

// sanity: group counts
const counts = {};
for (const o of ops) counts[o.tag] = (counts[o.tag] || 0) + 1;
console.log(counts);
