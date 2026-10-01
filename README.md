# Financy

Aplicação de gerenciamento de finanças pessoais com TypeScript, React, Vite, GraphQL, Prisma e SQLite.

## Desenvolvimento com Docker

Requer Docker com contêineres Linux e Docker Compose 2.32 ou superior. Não é necessário instalar Node.js ou pnpm no computador para usar este modo.

```sh
git clone https://github.com/raphaelrychard/Desafio-Pr-tico-Financy.git
cd Desafio-Pr-tico-Financy
docker compose up --build --watch
```

- Aplicação: http://localhost:5173
- API GraphQL: http://localhost:4000/graphql
- Verificação da API e do banco: http://localhost:4000/health

O Compose constrói dois serviços a partir do `Dockerfile`, instala as dependências e inicia o ambiente de desenvolvimento. A API aplica as migrações antes de iniciar; o frontend aguarda a API ficar saudável. A chave JWT é gerada automaticamente na primeira execução e permanece no volume junto ao SQLite. Nenhum arquivo `.env` é necessário para a configuração padrão.

O modo `--watch` sincroniza o código-fonte com os contêineres. O Vite atualiza a interface e o Compose reinicia a API ao salvar alterações. Mudanças nos manifests, no lockfile, no Dockerfile ou no schema/migrações do Prisma recompilam as imagens correspondentes. Alterações no schema exigem uma migração, conforme a seção abaixo.

### Comandos do ambiente

Execute estes comandos em outro terminal, na raiz do repositório:

```sh
# Iniciar em segundo plano, sem sincronização automática
docker compose up --build -d --wait

# Acompanhar os logs
docker compose logs -f

# Criar os dados fictícios de demonstração
docker compose exec backend pnpm db:seed

# Executar os testes em um banco temporário separado
docker compose exec backend pnpm test

# Verificar a compilação
docker compose exec backend pnpm build
docker compose exec frontend pnpm build

# Acessar um terminal no backend
docker compose exec backend sh

# Encerrar os serviços, preservando os dados
docker compose down
```

O volume `financy-data` guarda o banco e a chave JWT. Reiniciar, reconstruir as imagens ou usar `docker compose down` preserva esses arquivos. O uso de `docker compose down --volumes` apaga os dados do ambiente.

### Configuração opcional

O arquivo `.env.example` da raiz lista as opções do Compose. Copie-o para `.env` somente se quiser alterar portas ou fornecer uma chave própria. Os exemplos dentro de `backend` e `frontend` são usados na execução sem Docker.

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `FRONTEND_PORT` | `5173` | Porta do frontend no computador |
| `BACKEND_PORT` | `4000` | Porta da API no computador |
| `JWT_SECRET` | Gerado no volume | Substitui a chave automática; mínimo de 32 caracteres |

Também é possível alterar as portas apenas por comandos. No PowerShell:

```powershell
$env:FRONTEND_PORT="5174"
$env:BACKEND_PORT="4001"
docker compose up --build --watch
```

No Linux/macOS:

```sh
FRONTEND_PORT=5174 BACKEND_PORT=4001 docker compose up --build --watch
```

Use as mesmas variáveis nos terminais que administrarem o ambiente. O frontend chama `/graphql`, e o proxy do Vite encaminha a consulta para `backend:4000` na rede interna. As portas publicadas ficam acessíveis apenas no próprio computador. Este Dockerfile e o Compose destinam-se ao desenvolvimento local.

### Criar migrações

Depois de editar `backend/prisma/schema.prisma`, aguarde a reconstrução pelo Watch ou execute `docker compose up --build -d --wait`. Em seguida:

```sh
docker compose exec backend pnpm exec prisma migrate dev --name nome_da_alteracao
docker compose cp backend:/app/backend/prisma/migrations/. ./backend/prisma/migrations/
docker compose up --build -d --wait
```

A cópia traz as migrações criadas no contêiner para o repositório, para que possam ser versionadas. O banco SQLite não deve ser incluído no Git.

## Desenvolvimento sem Docker

### Requisitos

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
| `backend/.env` | `HOST` | Interface da API: `127.0.0.1`; Docker utiliza `0.0.0.0` |
| `backend/.env` | `CORS_ORIGIN` | Origem permitida: `http://localhost:5173` |
| `frontend/.env` | `VITE_BACKEND_URL` | Endpoint: `http://localhost:4000/graphql` |
| `frontend/.env` | `BACKEND_PROXY_URL` | Destino do proxy do Vite: `http://localhost:4000` |

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
Dockerfile        # Imagens de desenvolvimento do backend e frontend
compose.yaml      # Serviços, volume, verificações e sincronização
.dockerignore     # Arquivos excluídos das imagens
.env.example      # Configuração opcional do Compose
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
