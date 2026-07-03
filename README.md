# clicksign-api-3.0

Especificação OpenAPI e coleções de API (Postman, Insomnia e Bruno) para a
**API 3.0 (Envelope)** da Clicksign, geradas a partir da documentação pública:
https://developers.clicksign.com/reference/comece-agora

Entregável de Professional Services para acelerar integrações com a API da
Clicksign — sem precisar montar requisições na mão a partir da doc.

## Conteúdo

- **`collections/`** — o entregável: spec OpenAPI + coleções prontas para
  importar no Postman, Insomnia e Bruno. Veja [collections/README.md](collections/README.md)
  para instruções de import, variáveis de ambiente e observações sobre o spec.
- **`build/`** — scripts Node usados para gerar o conteúdo de `collections/`
  a partir do schema OpenAPI real embutido na documentação da Clicksign
  (não é uma spec escrita à mão — foi extraída da própria doc deles).

## Cobertura

56 endpoints em 15 grupos: Envelope, Documentos, Signatários, Requisitos,
Observadores de Assinaturas, Notificações, Eventos, Webhooks, Modelos,
Operações de Requisitos em Massa, Pastas, Termo Assinatura Automática,
Usuários, Membros e Aceite por WhatsApp.

## Regerando as coleções

Se a Clicksign atualizar a documentação, os scripts em `build/` podem ser
rodados novamente na ordem abaixo (cada etapa lê a saída da anterior em
`build/out/`):

```bash
node build/01_unify.js          # requer build/out/full_schema.json e matched.json
node build/02_openapi.js        # gera o OpenAPI mesclado (build/out/*.openapi.json)
node build/03_requests_model.js # normaliza os 56 endpoints em um modelo único
node build/04_postman.js
node build/05_insomnia.js
node build/06_bruno.js
```

`01_unify.js` depende de dois arquivos que não fazem parte deste repo
(`full_schema.json` — o schema OpenAPI bruto extraído da doc da Clicksign via
browser automation, e `matched.json` — o mapeamento de cada endpoint do menu
lateral da doc para sua operação no schema). Depois de rodar tudo, copie o
conteúdo de `build/out/` para `collections/` seguindo a mesma estrutura de
pastas já existente.

## Avisos

- A URL de produção (`https://app.clicksign.com/api/v3`) foi inferida pelo
  padrão de domínio da Clicksign — confirme com o time deles antes de usar
  em ambiente de cliente.
- Alguns campos do schema (`name`/`name1` em "Criar Envelope") vieram assim
  da própria documentação publicada pela Clicksign — não foram introduzidos
  por este gerador.
