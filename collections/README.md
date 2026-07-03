# Clicksign API v3 (Envelope) — Coleções

Gerado a partir da documentação pública da Clicksign:
https://developers.clicksign.com/reference/comece-agora

O spec OpenAPI foi extraído diretamente do schema interno usado pela própria
documentação (ReadMe.io), então parâmetros, request bodies e exemplos de
resposta refletem fielmente o que a Clicksign publica — não foram escritos à mão.

56 endpoints, agrupados em 15 categorias (Envelope, Documentos, Signatários,
Requisitos, Observadores de Assinaturas, Notificações, Eventos, Webhooks,
Modelos, Operações de Requisitos em Massa, Pastas, Termo Assinatura
Automática, Usuários, Membros, Aceite por WhatsApp).

## Estrutura

```
collections/
├── openapi/    clicksign-envelope-v3.openapi.json   (OpenAPI 3.0.3, validado)
├── postman/    coleção + ambientes Sandbox/Produção
├── insomnia/   export v4 (workspace + ambientes + pastas)
└── bruno/      coleção em pastas .bru (abrir a pasta direto no Bruno)
```

## Autenticação

Todas as chamadas usam:
- Header `Authorization: <access_token>` — **sem** prefixo `Bearer`.
- Header `Content-type: application/vnd.api+json` (padrão JSON:API).

Gere o Access Token em https://sandbox.clicksign.com (ambiente de testes,
sem valor legal) e preencha a variável `access_token` no ambiente da
ferramenta que for usar.

## Variáveis de ambiente

Todas as coleções usam as mesmas variáveis:

| Variável | Descrição | Default |
|---|---|---|
| `base_url` | Host da API | Sandbox: `https://sandbox.clicksign.com/api/v3` |
| `access_token` | Seu Access Token | (vazio, preencha) |
| `envelope_id`, `document_id`, `signer_id`, `requirement_id`, `signature_watcher_id`, `webhook_id`, `template_id`, `folder_id`, `user_id`, `membership_id`, `acceptance_term_id` | IDs usados nos paths | (vazio, preencha conforme for testando o fluxo) |

⚠️ **Produção**: a URL `https://app.clicksign.com/api/v3` foi inferida pelo
padrão de domínio da Clicksign (não está documentada explicitamente na página
pública consultada). Confirme com o time Clicksign/CS antes de apontar
qualquer ambiente de cliente para produção.

## Como importar

### Postman
1. Import → arraste os 3 arquivos de `postman/` (a coleção + os 2 ambientes).
2. Selecione o ambiente "Clicksign - Sandbox" no canto superior direito.
3. Preencha `access_token`.

### Insomnia
1. Application → Preferences → Import Data → From File → selecione
   `insomnia/Clicksign-API-v3-Envelope.insomnia.json`.
2. Isso cria o workspace, o "Base Environment" e os sub-ambientes
   Sandbox/Produção. Edite o Base Environment para preencher `access_token`.

### Bruno
1. Open Collection → selecione a pasta `bruno/` inteira (ela já tem o
   `bruno.json` na raiz).
2. Escolha o ambiente Sandbox ou Producao no seletor de ambiente do Bruno.
3. Preencha `access_token` no ambiente.

## Observações sobre o spec

- **Endpoints com múltiplos "modos" no mesmo path**: `Criar Documento`
  (Upload / por Modelo / por Duplicar), `Criar Requisito` (Qualificação /
  Autenticação / Rubrica) e `Criar Evento` (customizado / com imagem) são,
  na API real, o mesmo `path`+método HTTP com corpos diferentes. No arquivo
  **OpenAPI** eles aparecem como uma única operação com `oneOf` e exemplos
  nomeados (para manter o spec tecnicamente válido). Nas coleções
  **Postman/Insomnia/Bruno** eles aparecem como requests separadas — mais
  prático no dia a dia, já que são ações distintas.
- Os corpos de exemplo foram montados a partir dos `default`/`enum` de cada
  campo no schema da Clicksign. Dois campos (`name` no nível raiz e
  `attributes.name1` em `Criar Envelope`) vieram assim do schema publicado
  pela própria Clicksign — parecem resíduo de edição da documentação deles;
  pode ignorar/remover ao montar a requisição real.
