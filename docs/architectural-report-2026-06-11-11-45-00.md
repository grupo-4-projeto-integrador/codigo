# Relatório de Análise Arquitetural

## 1. Sumário Executivo
Este projeto é uma aplicação web Full-Stack moderna adaptada para o gerenciamento de apólices de seguro. A arquitetura consiste em um frontend em React/TypeScript utilizando Vite para builds rápidos, juntamente com um backend em Go expondo uma API RESTful. A camada de dados persistente é suportada pelo PostgreSQL. O sistema emprega uma arquitetura padrão Cliente-Servidor e adota os princípios de Domain-Driven Design (DDD) na estrutura do seu backend, com pacotes distintos para domínios como `apolice`, `audit`, `auth` e `notificacao`. Docker e Docker Compose orquestram a infraestrutura, conteinerizando os serviços de backend, frontend e banco de dados.

## 2. Visão Geral do Sistema
O projeto está dividido em workspaces discretos de backend e frontend, garantindo uma arquitetura desacoplada.

project-root/
├── backend/             # Camada de API em Go e Regras de Negócio
│   ├── cmd/             # Pontos de entrada da aplicação (api, migrate)
│   ├── internal/        # Lógica de negócio de domínio (apolice, audit, auth, database, middleware, notificacao)
│   ├── migrations/      # Migrations de esquema do banco de dados
│   └── pkg/             # Bibliotecas compartilhadas e utilitários
├── frontend/            # Cliente React SPA
│   ├── public/          # Assets estáticos
│   └── src/             # Código-fonte da aplicação
│       ├── api/         # Camada de integração com API (client.ts, apolice.ts, audit.ts, etc.)
│       ├── components/  # Componentes de UI reutilizáveis
│       ├── pages/       # Componentes a nível de rota
│       └── styles/      # Estilos globais e configurações de tema
├── docs/                # Documentação do projeto
└── docker-compose.yml   # Orquestração multi-contêiner

## 3. Análise dos Componentes Críticos

**Definição das Métricas de Acoplamento:**
* **Acoplamento Aferente (CA):** Mede o número de dependências de entrada. Um CA alto indica que um componente é muito utilizado por outras partes do sistema, tornando-o estruturalmente significativo e arriscado de alterar.
* **Acoplamento Eferente (CE):** Mede o número de dependências de saída. Um CE alto sugere que um componente depende de muitos outros módulos, tornando-o vulnerável a mudanças nessas dependências externas.

| Componente | Tipo | Localização | Acoplamento Aferente | Acoplamento Eferente | Papel Arquitetural |
| --- | --- | --- | --- | --- | --- |
| **Entrada do Servidor API** | Ponto de Entrada | `backend/cmd/api/main.go` | Baixo | Baixo | Inicializa a aplicação através do pacote interno `app` |
| **Domínio de Apólice** | Módulo | `backend/internal/apolice/` | Alto | Médio | Domínio principal de negócios que gerencia as apólices (`dto`, `handler`, `repository`, `service`) |
| **Domínio de Auth** | Módulo | `backend/internal/auth/` | Alto | Baixo | Gerencia autenticação e validação de JWT |
| **Pacote de Banco de Dados** | Infraestrutura | `backend/internal/database/` | Muito Alto | Baixo | Pool de conexões e acesso ao PostgreSQL |
| **Cliente de API (Frontend)** | Integração | `frontend/src/api/client.ts` | Alto | Baixo | Wrapper centralizado de cliente HTTP para a API Go |
| **Comando Migrate** | CLI / Ops | `backend/cmd/migrate/` | Baixo | Médio | Executa as migrations de esquema de banco de dados antes de iniciar a API |

## 4. Mapeamento de Dependências

Dependências de Alto Nível:
Frontend (React/Vite) → Backend (API REST em Go)
Backend (Go) → PostgreSQL (Banco de Dados)

Fluxo Interno do Backend (Arquitetura em Camadas):
Router HTTP/Middleware → Handlers de Domínio (ex: apolice.handler)
Handlers de Domínio → Serviços de Domínio (ex: apolice.service)
Serviços de Domínio → Repositórios de Domínio (ex: apolice.repository)
Repositórios de Domínio → Pacote de Banco de Dados (internal/database)

## 5. Pontos de Integração

| Integração | Tipo | Localização | Propósito | Nível de Risco |
| --- | --- | --- | --- | --- |
| **PostgreSQL** | Banco de Dados | `docker-compose.yml` (serviço `db`) | Armazenamento primário de dados persistentes | Médio |
| **JWT** | Protocolo de Auth | `backend/internal/auth/` | Autenticação stateless segura para a API REST | Baixo |

## 6. Riscos Arquiteturais e Pontos Únicos de Falha

| Nível de Risco | Componente | Problema | Impacto | Detalhes |
| --- | --- | --- | --- | --- |
| **Alto** | Banco de Dados (`db`) | Ponto único de falha | Em todo o sistema | Nenhuma replicação ou cluster está definido atualmente na configuração do docker-compose. Uma falha no banco de dados paralisa toda a aplicação. |
| **Médio** | Servidor Backend | Instância única | Em todo o sistema | O `docker-compose.yml` provisiona um único contêiner de backend. Carga pesada pode ser um gargalo para a API. |
| **Médio** | Diretório de Uploads | Armazenamento local | Perda de Dados | Há uma pasta `backend/uploads/` indicando armazenamento de arquivos local. Armazenar arquivos localmente em um ambiente conteinerizado apresenta risco de perda de dados caso o contêiner seja recriado, a menos que mapeado para um volume externo. |

## 7. Avaliação da Stack Tecnológica

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, Radix UI Primitives, React Router v7, React Hook Form, Recharts. Esta é uma stack de SPA muito moderna e robusta.
* **Backend:** Go 1.22, roteamento HTTP da biblioteca padrão (ou roteador leve), `lib/pq` para PostgreSQL, `joho/godotenv` para gerenciamento de configurações e `golang-jwt` para autenticação. O backend em Go segue uma estrutura de design baseada em camadas e orientada a domínios (DDD).
* **Infraestrutura:** Docker e Docker Compose. O padrão Wait-for-it (usando o healthcheck `pg_isready`) é implementado para garantir que o banco de dados esteja pronto.
* **Padrões Arquiteturais:** Arquitetura em Camadas (Handler-Service-Repository), Domain-Driven Design (pacotes de domínio em `internal/`), Arquitetura Cliente-Servidor, Single Page Application (SPA).

## 8. Arquitetura de Segurança e Riscos

* **Autenticação JWT:** Implementada via o domínio `auth` e `golang-jwt`. Cuidados devem ser tomados em relação à expiração do token e gerenciamento da chave secreta (`.env`).
* **Variáveis de Ambiente:** Credenciais e URLs do banco de dados são passados via arquivos `.env` e variáveis de ambiente do `docker-compose.yml`. É fundamental garantir que o `.env` nunca seja commitado no controle de versão.
* **Uploads Locais:** Se `backend/uploads/` não estiver devidamente protegido, pode ser vulnerável a upload arbitrário de arquivos ou ataques de *path traversal*.
* **Credenciais de Banco de Dados:** O arquivo `docker-compose.yml` contém senhas de *fallback* hardcoded (`sua_senha`). Embora aceitável para dev local, isso apresenta um risco grave se propagado para produção.

## 9. Análise de Infraestrutura

O projeto emprega uma configuração conteinerizada clara via `docker-compose.yml`:
* **Serviços:** `db` (PostgreSQL 15), `backend` (API Go), `frontend` (Nginx/React).
* **Volumes:** `postgres_data` garante persistência de dados através dos reinícios dos contêineres.
* **Rede:** Os serviços estão interconectados; `frontend` depende de `backend`, e `backend` depende de `db` via um healthcheck (`condition: service_healthy`).
* **Padrão de Implantação:** O backend usa um comando de inicialização combinado (`sh -c "./migrate && ./api-server"`), garantindo que as migrations sejam executadas automaticamente antes que a API comece a aceitar tráfego.
