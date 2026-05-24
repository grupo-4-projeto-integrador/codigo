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

No mínimo, você precisa criar o banco `seguros_db` e aplicar a migration inicial.

### 3. Configurar variáveis de ambiente

O backend não usa credenciais hard-coded. Defina as variáveis antes de iniciar a API.

PowerShell:

```powershell
Set-Location c:\Users\kamik\Desktop\PoC\codigo\backend
$env:PG_HOST = 'localhost'
$env:PG_PORT = '5432'
$env:PG_USER = 'postgres'
$env:PG_PASSWORD = 'sua_senha'
$env:PG_DBNAME = 'seguros_db'
$env:PG_SSLMODE = 'disable'
```

Linux / macOS:

```bash
cd codigo/backend
export PG_HOST=localhost
export PG_PORT=5432
export PG_USER=postgres
export PG_PASSWORD=sua_senha
export PG_DBNAME=seguros_db
export PG_SSLMODE=disable
```

### 4. Iniciar o backend

```powershell
Set-Location c:\Users\kamik\Desktop\PoC\codigo\backend
go run ./cmd/api
```

O servidor sobe em `http://localhost:8082` por padrão.

### 5. Iniciar o frontend

```powershell
Set-Location c:\Users\kamik\Desktop\PoC\codigo\frontend
corepack pnpm install
corepack pnpm dev
```

### 6. Build e testes

Backend:

```powershell
Set-Location c:\Users\kamik\Desktop\PoC\codigo\backend
go test ./...
go build ./...
```

Frontend:

```powershell
Set-Location c:\Users\kamik\Desktop\PoC\codigo\frontend
corepack pnpm test
corepack pnpm build
```

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
