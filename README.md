# Grupo-4-Projeto-Integrador

Projeto de Seguros com backend em Go e frontend em React/Vite.

## O que tem aqui

- `backend/`: API em Go, migrations e utilitário de importação de seed.
- `frontend/`: frontend React/Vite (pnpm).
- `backend/seed_apolices.sql`: script complementar que popula as tabelas.

## Como rodar do zero

### Pré-requisitos

- Go 1.26+.
- Node.js 18+.
- PostgreSQL 15+.

### Passo a passo mais simples

Para facilitar a vida do grupo, criamos um script que faz toda a configuração do banco de dados automaticamente! Certifique-se apenas de ter o PostgreSQL instalado e rodando.

1. **Configure o Banco de Dados e as Variáveis**

Na pasta raiz do projeto, entre na pasta `backend` e rode o nosso script automático. Ele vai criar as tabelas, inserir os dados e criar o arquivo `.env` sozinho:

```powershell
cd backend
go run prepare_db.go
```

1. **Suba o backend**

Ainda na pasta `backend`:

```powershell
go run ./cmd/api
```

1. **Suba o frontend**

Abra um novo terminal, entre na pasta `frontend`, instale as dependências e rode:

```powershell
cd frontend
corepack pnpm install
corepack pnpm dev
```
