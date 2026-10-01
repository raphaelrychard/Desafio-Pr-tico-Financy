# Financy

Aplicação de gerenciamento de finanças pessoais com TypeScript, React, Vite, GraphQL, Prisma e SQLite.

## Requisitos

- Node.js 22.18 ou superior
- pnpm 10 ou 11

## Instalação

```sh
pnpm install
```

Copie `backend/.env.example` para `backend/.env` e `frontend/.env.example` para `frontend/.env`.

No PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

No Linux ou macOS:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

No arquivo `backend/.env`, preencha `JWT_SECRET` com uma chave aleatória de pelo menos 32 caracteres. Para gerar uma chave:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Prepare o banco e inicie a aplicação:

```sh
pnpm db:setup
pnpm dev
```

- Frontend: http://localhost:5173
- API GraphQL: http://localhost:4000/graphql

O banco SQLite é armazenado em `backend/prisma/dev.db`. Os dados permanecem salvos entre execuções. No Windows, caso o Prisma não consiga criar o arquivo inicial, crie um arquivo vazio `backend/prisma/dev.db` e execute `pnpm db:setup` novamente. Encerre a API antes de gerar novamente o Prisma Client.

## Variáveis de ambiente

| Arquivo | Variável | Descrição |
| --- | --- | --- |
| `backend/.env` | `JWT_SECRET` | Chave usada na assinatura dos tokens |
| `backend/.env` | `DATABASE_URL` | URL do SQLite: `file:./dev.db` |
| `backend/.env` | `PORT` | Porta da API: `4000` |
| `backend/.env` | `CORS_ORIGIN` | Origem permitida: `http://localhost:5173` |
| `frontend/.env` | `VITE_BACKEND_URL` | Endpoint: `http://localhost:4000/graphql` |

Use `localhost` no navegador para corresponder à origem configurada no CORS. Alterações nas variáveis do frontend exigem reiniciar o Vite ou gerar uma nova compilação. Os arquivos `.env` e o banco de dados não devem ser versionados.

## Comandos

| Comando | Função |
| --- | --- |
| `pnpm dev` | Inicia frontend e backend em desenvolvimento |
| `pnpm db:setup` | Gera o Prisma Client e aplica as migrações |
| `pnpm build` | Compila frontend e backend |
| `pnpm test` | Executa o teste de integração da API |
| `pnpm demo` | Cria uma conta local com dados fictícios |

Para executar a versão compilada, use dois terminais:

```sh
pnpm --dir backend start
```

```sh
pnpm --dir frontend preview
```

## Funcionalidades

- Cadastro e login com JWT e senhas protegidas por bcrypt.
- Dashboard com saldo acumulado, receitas e despesas do mês e transações recentes.
- Criação, listagem, edição e exclusão de transações e categorias.
- Busca por descrição, filtros por tipo, categoria e mês e paginação.
- Categorias com descrição, ícone e cor.
- Edição do nome no perfil e encerramento de sessão.
- Interface responsiva com confirmações de exclusão e mensagens de validação.

## Estrutura

```text
backend/
  prisma/          # Schema, migrações e seed
  src/             # Servidor e API GraphQL
  tests/           # Teste de integração
  .env.example
frontend/
  public/          # Arquivos estáticos
  src/             # Páginas, componentes, formulários e estilos
  .env.example
.github/workflows/ # Validação contínua
```

## Rotas

| Rota | Página |
| --- | --- |
| `/` | Login sem sessão; dashboard com sessão |
| `/cadastro` | Cadastro |
| `/transacoes` | Transações |
| `/categorias` | Categorias |
| `/perfil` | Perfil |

## Regras de negócio

- Cada usuário acessa somente suas próprias transações e categorias.
- Uma transação só pode utilizar uma categoria do usuário autenticado.
- Categorias com transações vinculadas não podem ser excluídas. É necessário reclassificar ou excluir as transações primeiro.
- Valores são armazenados em centavos inteiros. A interface aceita `125,50` ou `125.50`, sem separador de milhar.
- Datas usam o formato `YYYY-MM-DD`, sem conversão de fuso horário.
- O saldo considera todo o histórico. Os indicadores mensais consideram o mês atual.
- A sessão dura 8 horas ou 30 dias quando a opção “Lembrar-me” está selecionada.

## API

O schema completo pode ser consultado no explorador GraphQL em `/graphql`. Operações protegidas exigem `Authorization: Bearer <token>`.

Consultas: `me`, `categories`, `transactions`, `dashboard`.

Mutações: `register`, `login`, `updateProfile`, `createCategory`, `updateCategory`, `deleteCategory`, `createTransaction`, `updateTransaction`, `deleteTransaction`.

## Testes

O teste de integração cria um banco SQLite temporário e verifica autenticação, CRUD, isolamento entre contas, validação de valores e datas, filtros, resumo financeiro, perfil, persistência e CORS. O banco de desenvolvimento não é alterado.

O fluxo de integração contínua executa instalação, migrações, compilação e testes em cada push ou pull request.

## Demonstração

Após executar `pnpm demo`:

- E-mail: `demo@financy.local`
- Senha: `Financy@123`

Os dados são fictícios e a conta se destina apenas ao uso local. Novas contas começam vazias.
