# Grupo-4-Projeto-Integrador

Projeto de Seguros com backend em Go e frontend em React/Vite.

## O que tem aqui

- `backend/`: API em Go, migrations e utilitário de importação de seed.
- `frontend/`: frontend React/Vite (pnpm).
- `backend/seguros.sql`: dump base com as apólices reais para seed local e no CI.
- `backend/seed_apolices.sql`: script complementar que popula `coberturas` e `historico_apolice`.
- `database/`: scripts SQL legados e referências históricas.

## Como rodar do zero

### Pré-requisitos

- Go 1.26+.
- Node.js 18+.
- PostgreSQL 15+.

### Passo a passo mais simples

1. Inicie o PostgreSQL e crie o banco.

```powershell
createdb -U postgres seguros
```

1. Aplique a migration inicial.

```powershell
Set-Location backend
psql -U postgres -d seguros -f migrations/initial_schema.sql
```

1. Configure as variáveis de ambiente do backend.

Crie um arquivo `.env` na pasta `backend/` com o seguinte conteúdo (ajuste a senha se necessário):

```env
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=sua_senha
PG_DBNAME=postgres
PG_SSLMODE=disable
```

1. Suba o backend.

```powershell
go run ./cmd/api
```

1. Em outro terminal, instale dependências e suba o frontend.

```powershell
Set-Location frontend
corepack pnpm install
corepack pnpm dev
```

Se quiser tudo junto sem configurar manualmente, use Docker:

```powershell
docker-compose up --build -d
```

### Build e testes

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

## Docker

Subir tudo de uma vez:

```powershell
docker-compose up --build -d
```

Encerrar o ambiente:

```powershell
docker-compose down
```

---

## CI

O workflow está em [.github/workflows/ci.yml](.github/workflows/ci.yml).

- O job de integração usa o secret `POSTGRES_PASSWORD`.
- O passo de migrations roda com seed via `go run ./cmd/migrate -seed`, que importa o dump base `seguros.sql` e depois gera `coberturas` e `historico_apolice`.

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
