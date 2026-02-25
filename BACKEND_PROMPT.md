# Prompt de Implementação Backend - Personalização de Categorias

## Contexto
Atualmente, as categorias no sistema são globais (todos os usuários veem as mesmas categorias). O objetivo é permitir que cada usuário tenha suas próprias categorias personalizadas, mantendo a possibilidade de categorias "do sistema" ou "compartilhadas" que são visíveis para todos.

## Objetivos Técnicos

### 1. Modelo de Dados (Banco de Dados)
- Adicionar uma coluna `user_id` (UUID, nullable) na tabela `categories`.
- Adicionar uma chave estrangeira para a tabela `users`.
- Se `user_id` for **NULL**, a categoria é considerada "Global/Sistema".
- Se `user_id` for preenchido, a categoria é "Privada" daquele usuário.

### 2. Atualização de Endpoints (API)

#### `GET /api/v1/categories`
- Deve aceitar um parâmetro opcional via query: `user_id`.
- A lógica de busca deve retornar: `WHERE user_id IS NULL OR user_id = :user_id`.
- Se o `user_id` não for informado, retornar apenas as categorias globais (`user_id IS NULL`).

#### `POST /api/v1/categories`
- O payload de criação (`CreateCategoryRequest`) deve aceitar um campo opcional `user_id`.
- Se enviado, salvar a categoria vinculada ao usuário.

#### `PUT /api/v1/categories/{id}` e `DELETE /api/v1/categories/{id}`
- Adicionar validação de posse: Um usuário só pode editar/excluir categorias que ele mesmo criou (`user_id` dele).
- Categorias globais (`user_id IS NULL`) não devem ser editáveis/excluíveis via API comum (ou apenas por administradores, se houver essa lógica).

### 3. Contrato e Documentação
- Atualizar o arquivo `openapi.yaml` refletindo o novo campo `user_id` no schema `Category` e nos parâmetros do endpoint `GET`.
- Atualizar o `RULES.md` com a nova regra `CAT-04`.

## Regra de Negócio Sugerida
- **CAT-04**: Uma categoria pode ser global (disponível para todos) ou privada (visível apenas para o usuário criador). Categorias globais são usadas para despesas de casa/compartilhadas.

### 4. Validações de Despesas (Integridade)
- **Validação de Compartilhamento (DSP-06 & DSP-07)**:
    - Se `type == 'SHARED'`, o array `shared_user_ids` deve conter **pelo menos 2 usuários**.
    - Se `type == 'SHARED'`, o `user_id` (pagador) **deve obrigatoriamente** estar presente dentro do array `shared_user_ids`.
    - Caso contrário, retornar erro 400 (Bad Request).
