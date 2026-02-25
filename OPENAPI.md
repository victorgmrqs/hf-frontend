# Contrato OpenAPI – Integração com Stitch

Este projeto expõe a API via **OpenAPI 3.0** no arquivo `openapi.yaml`. Use esse arquivo para integração com ferramentas de design e frontend, como o [Stitch (Google)](https://stitch.withgoogle.com/).

## O que está incluído

- **Base URL**: `http://localhost:8080` (configurável em `servers`)
- **Endpoints**: Health, Users, Categories, Payment Methods, Expenses
- **Schemas**: Request/response de todos os recursos, enums (tipos de despesa, forma de pagamento), formato padrão `{ data, error }`
- **Parâmetros**: Path (UUIDs), query (competence, type), bodies JSON

## Como usar com o Stitch

1. Acesse [https://stitch.withgoogle.com/](https://stitch.withgoogle.com/).
2. Ao criar ou configurar o projeto do frontend, use a opção de **importar API** ou **conectar API**.
3. Forneça o arquivo `openapi.yaml`:
   - **Arquivo local**: faça upload do `openapi.yaml` do repositório.
   - **URL**: se o YAML estiver servido (ex.: via GitHub raw ou servidor estático), informe a URL.
4. Ajuste o **server** no Stitch se necessário (ex.: trocar `localhost` pelo host da API em produção).

## Manter o contrato atualizado

- Ao adicionar ou alterar rotas em `internal/handler/router.go`, atualize os `paths` em `openapi.yaml`.
- Ao mudar DTOs de request/response nos handlers, atualize os `components/schemas` correspondentes.
- Para validar o YAML, use por exemplo:
  - [Swagger Editor](https://editor.swagger.io/) (colar o conteúdo ou abrir o arquivo)
  - CLI: `npx @redocly/cli lint openapi.yaml` ou `docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli validate -i /local/openapi.yaml`

## Outros usos do openapi.yaml

- **Geração de clientes**: OpenAPI Generator, Swagger Codegen, etc.
- **Documentação**: Redoc, Swagger UI (servir o YAML).
- **Testes**: Postman/Insomnia importam OpenAPI para criar coleções.
- **Contratos**: Garantir que o frontend (Stitch ou outro) e o backend sigam o mesmo contrato.
