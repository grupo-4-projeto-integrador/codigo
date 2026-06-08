# Flamboyant Shopping - Sistema de Gestão de Seguros (PoC)

Bem-vindo ao repositório do **Sistema de Gestão de Seguros** do Flamboyant Shopping. Este projeto é um projeto acadêmico desenvolvido para centralizar, monitorar e gerenciar todas as apólices de seguros dos lojistas de forma eficiente, visual e segura.

## 🎯 Objetivo do Projeto

O objetivo principal deste sistema é automatizar e simplificar a gestão de conformidade de seguros dos lojistas (LUCs). Anteriormente gerenciado em planilhas, o novo sistema oferece uma visão em tempo real, controle rigoroso de acesso e um mapa de conformidade visual que facilita a identificação de riscos.

## 🚀 Funcionalidades Principais

* **Dashboard Interativo**: Visão geral com KPIs em tempo real (Health Score de conformidade, total segurado, taxas de renovação).
* **Mapa de Conformidade**: Visualização em grid de todos os LUCs (Lojas) com cores indicativas do status da apólice (Vigente, Vencida, A Vencer).
* **Gestão de Apólices (CRUD)**: Criação, edição, visualização e deleção de apólices, com suporte a upload de documentos comprobatórios.
* **Sistema de Notificações Inteligente**: Avisos automatizados e com memória persistente sobre apólices vencidas ou prestes a vencer.
* **Controle de Acesso (RBAC)**: 
  * **Admin**: Acesso total, incluindo Gestão de Usuários e visualização do Audit Log.
  * **Gestor**: Pode criar, editar e renovar apólices.
  * **Visualizador**: Acesso apenas para leitura dos dados e relatórios.
* **Audit Log (Trilha de Auditoria)**: Registro imutável de todas as ações realizadas no sistema, incluindo o diff (antes/depois) das alterações, quem fez e quando.
* **Produtividade & UI/UX**:
  * **Modo Apresentação**: Oculta menus laterais para focar nos dados durante reuniões.
  * **Atalhos de Teclado**: Navegação rápida por todo o sistema (ex: `Alt+H` para Home, `Ctrl+K` para busca).
  * **Dark Mode / Light Mode**: Interface adaptável à preferência do usuário.
  * **Exportação**: Geração de relatórios em PDF e Excel.

## 🛠 Tecnologias Utilizadas

O projeto foi construído utilizando uma arquitetura moderna e escalável:

### Frontend
* **React 18** (com Vite)
* **TypeScript**
* **Tailwind CSS** + **Shadcn UI** para estilização e componentes acessíveis.
* **Framer Motion** para animações fluidas e premium.
* **Recharts** para renderização de gráficos.
* **React Router v7** para roteamento.

### Backend
* **Go (Golang)**: Alta performance, concorrência e baixo uso de memória.
* **PostgreSQL**: Banco de dados relacional robusto.
* **JWT (JSON Web Tokens)**: Para autenticação segura e stateless.
* **Bcrypt**: Para hash e segurança das senhas dos usuários.

## ⚙️ Como Executar o Projeto Localmente

### Pré-requisitos
* **Node.js** (v18+) e **pnpm** (ou npm/yarn)
* **Go** (v1.21+)
* **PostgreSQL** instalado e rodando localmente (porta 5432).

### 1. Configurando o Banco de Dados
O backend possui um utilitário escrito em Go que cria o banco, roda as migrações e insere dados de teste automaticamente.
```bash
cd backend
go run prepare_db.go
```
*O script perguntará a senha do seu usuário `postgres` e configurará o banco de dados e o arquivo `.env` para você.*

### 2. Rodando o Backend (API)
Ainda na pasta `backend`:
```bash
go run ./cmd/api
```
*O servidor iniciará na porta `:8080`.*

### 3. Rodando o Frontend
Em um novo terminal, vá para a pasta `frontend`:
```bash
cd frontend
pnpm install
pnpm dev
```
*Acesse `http://localhost:5173` no seu navegador.*

## 🔐 Usuários de Teste

O script de banco de dados cria três usuários iniciais para testar os diferentes níveis de acesso:

| Papel | Email | Senha |
| :--- | :--- | :--- |
| **Admin** | `joao@flamboyant.com` | `admin123` |
| **Gestor** | `maria@flamboyant.com` | `gestor123` |
| **Visualizador** | `pedro@flamboyant.com` | `viewer123` |

## 📐 Estrutura do Repositório

* `/backend` - Código fonte da API em Go, rotas, middlewares, models de banco de dados e scripts SQL de migração.
* `/frontend` - Código fonte do SPA em React, componentes da interface, hooks, contextos e integração com a API.
* `/docs` - Documentação técnica complementar (Dossiê Técnico, Requisitos, etc).

---
*Desenvolvido como Prova de Conceito para o gerenciamento inteligente de seguros lojistas.*
