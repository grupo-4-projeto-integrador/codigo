# Grupo-4-Projeto-Integrador

Projeto de Seguros com backend em Go e frontend em React/Vite.

## O que tem aqui

- `backend/`: API em Go, migrations e utilitário de importação de seed.
- `frontend/`: frontend React/Vite (pnpm).
- `legacy/`: módulo Go legado; hoje o fluxo principal usa `backend/`.
- `legacy/seguros.sql`: dump com dados para seed local e no CI.
- `database/`: scripts SQL legados e referências históricas.

## Como rodar do zero

### 1. Pré-requisitos

- Go 1.26+.
- Node.js 18+.
- PostgreSQL 15+.

### 2. Preparar o banco

As instruções completas de migration estão em [backend/MIGRATIONS_README.md](backend/MIGRATIONS_README.md).

No mínimo, você precisa criar o banco `seguros` e aplicar a migration inicial.

### 3. Configurar variáveis de ambiente

O backend não usa credenciais hard-coded. Defina as variáveis antes de iniciar a API.

PowerShell:

```powershell
Set-Location backend
$env:PG_HOST = 'localhost'
$env:PG_PORT = '5432'
$env:PG_USER = 'postgres'
$env:PG_PASSWORD = 'sua_senha'
$env:PG_DBNAME = 'seguros'
$env:PG_SSLMODE = 'disable'
```

Linux / macOS:

```bash
cd backend
export PG_HOST=localhost
export PG_PORT=5432
export PG_USER=postgres
export PG_PASSWORD=sua_senha
export PG_DBNAME=seguros
export PG_SSLMODE=disable
```

### 4. Iniciar o backend

```powershell
Set-Location backend
go run ./cmd/api
```

O servidor sobe em `http://localhost:8082` por padrão.

Se você abrir `http://localhost:8082`, verá uma página simples de status do backend. Para checar a API de forma objetiva, use `http://localhost:8082/api/health`.

> **Dica:** O backend expõe apenas ` /api/* `. Rotas como `/seguros` e `/dashboard` são do frontend.

### 5. Iniciar o frontend

```powershell
Set-Location frontend
corepack pnpm install
corepack pnpm dev
```

O frontend de desenvolvimento roda em `http://localhost:5173`.

Se quiser abrir a interface pelo endereço simples `http://localhost`, use o Docker Compose, que sobe o Nginx na porta 80 e encaminha `/api/*` para o backend.

### 6. Build e testes

Backend:

```powershell
Set-Location backend
go test ./...
go build ./...
```

Frontend:

```powershell
Set-Location frontend
corepack pnpm test
corepack pnpm build
```

## Como rodar o projeto via Docker (Recomendado)

A maneira mais simples, rápida e padronizada de rodar o sistema inteiro (seja no PC da faculdade, no trabalho ou em casa) é usando o Docker Compose.

Siga este passo a passo:

### 1. Clonar o Repositório

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd <NOME_DA_PASTA>
```

*(Se você já tem os arquivos baixados, apenas certifique-se de estar dentro da pasta raiz)*

### 2. Subir o ambiente completo

Esse comando fará o download das imagens necessárias (Node, Go, Postgres) e executará o build simultâneo do Backend e Frontend:

```bash
docker-compose up --build -d
```

*(A flag `-d` deixa rodando em segundo plano. Se quiser ver os logs em tempo real, basta tirar o `-d`)*

### 3. Acessar a aplicação

O Docker cuidará de todo o roteamento. Basta abrir o seu navegador em:

- **Frontend / Aplicação Completa**: [http://localhost](http://localhost) (Nginx na porta 80).

> **Atenção (Rotas Frontend vs Backend):** Se você tentar acessar `http://localhost/seguros` ou `http://localhost:8082/seguros`, ainda pode ver 404. Isso é esperado: `/seguros` e `/dashboard` pertencem ao frontend (SPA). O backend em Go serve a API em `/api/*` e também uma página simples em `/` para confirmar que ele iniciou.
> Para testar o backend independentemente do frontend, use **`http://localhost:8082/api/health`**.

A API do backend estará rodando internamente na porta **8082** e o banco de dados Postgres na porta **5432**, todos interligados automaticamente. O frontend também direcionará todas as rotas `/api/*` para o backend sem necessidade de configuração adicional.

### 4. Parar e desligar tudo

Quando terminar o trabalho, para encerrar e remover os contêineres graciosamente, execute:

```bash
docker-compose down
```

---

## CI

O workflow está em [.github/workflows/ci.yml](.github/workflows/ci.yml).

- O job de integração usa o secret `POSTGRES_PASSWORD`.
- O passo de migrations roda com seed via `go run ./cmd/migrate -seed`.

## Atalhos de desenvolvimento

No Windows, use o [script PowerShell](dev.ps1) para os comandos mais comuns:

```powershell
.\dev.ps1 backend-run
.\dev.ps1 backend-test
.\dev.ps1 migrate-seed
.\dev.ps1 frontend-dev
.\dev.ps1 frontend-test
.\dev.ps1 frontend-build
```

Se preferir, o [Makefile](../Makefile) continua disponível para ambientes com GNU Make.

## Observações

- Se quiser popular o banco manualmente fora do CI, siga o [guia de migrations](backend/MIGRATIONS_README.md).
- Se preferir usar um `.env`, copie `backend/.env.example` para `backend/.env` e ajuste os valores.
