#  Sistema de Seguros - Arquitetura C4 Model

##  Visão Geral

O Sistema de Seguros é uma plataforma responsável pelo gerenciamento das apólices de seguros do shopping, centralizando informações relacionadas a contratos, documentos, auditorias, notificações e indicadores operacionais.

A arquitetura foi documentada utilizando o C4 Model

---

# Nível 1 — Contexto do Sistema

## Objetivo

O Diagrama de Contexto apresenta uma visão macro do sistema, identificando os usuários que interagem com a plataforma e os sistemas externos que participam do ecossistema.

## Usuários

### Administrador

Responsável pelo gerenciamento completo da plataforma.

### Gestor

Responsável pela criação, edição e renovação das apólices.

### Visualizador / Logista

Perfil com acesso somente leitura.

## Sistemas Externos

### Sistema de Sinistros

Sistema mantido por outro grupo responsável pela abertura, acompanhamento e regulação de sinistros.

### Seguradora Parceira

Responsável pela validação e cobertura das apólices.


## Diagrama

```mermaid
flowchart TB

Admin["Administrador"]
Gestor["Gestor"]
Visualizador["Visualizador"]

Sistema["Sistema de Seguros<br/>CRM para gestão de apólices"]

Sinistros["Sistema de Sinistros"]
Seguradora["Seguradora Parceira"]

Admin -->|Usa| Sistema
Gestor -->|Usa| Sistema
Visualizador -->|Usa| Sistema

Sistema -->|Registra e consulta sinistros| Sinistros
Sistema -->|Valida apólices e coberturas| Seguradora
Sistema -->|Consulta contratos| Banco

style Sistema fill:#1565C0,color:#fff,stroke:#0D47A1
style Sinistros fill:#BDBDBD,color:#fff
style Seguradora fill:#BDBDBD,color:#fff
style Banco fill:#BDBDBD,color:#fff
```

---

# Nível 2 — Containers

## Objetivo

O Diagrama de Containers apresenta os principais blocos executáveis que compõem a solução.

## Containers

### Frontend Web

Interface utilizada pelos usuários.

### Backend API

Responsável pela lógica de negócio, integrações e processamento das operações.

### Banco de Dados Principal

Responsável pela persistência dos dados da aplicação.

## Diagrama

```mermaid
flowchart TB

Admin["Administrador"]
Gestor["Gestor"]
Visualizador["Visualizador"]

subgraph Sistema["Sistema de Seguros"]
style Sistema fill:none,stroke:#1565C0,stroke-width:2px,stroke-dasharray: 8 4

    Frontend["Frontend Web"]

    Backend["Backend API"]

    Database[("Banco de Dados Principal")]

    Frontend --> Backend
    Backend --> Database

end

Admin --> Frontend
Gestor --> Frontend
Visualizador --> Frontend

%% Agrupa os sistemas externos logo abaixo da API

subgraph Externos["Sistemas Externos"]
style Externos fill:none,stroke:none

direction LR

Sinistros["Sistema de Sinistros"]

Seguradora["Seguradora Parceira"]

end

Backend -->|"Registrar sinistro"| Sinistros
Backend -->|"Validar cobertura"| Seguradora

classDef container fill:#1976D2,color:#fff,stroke:#1565C0;
classDef externo fill:#BDBDBD,color:#fff,stroke:#757575;

class Frontend,Backend container;
class Sinistros,Seguradora externo;
```

---

# Nível 3 — Componentes

## Objetivo

O Diagrama de Componentes detalha a estrutura interna da Backend API.

## Componentes

### Routes

Mapeamento dos endpoints.

### Auth Module

Autenticação e autorização.

### Apolice Handler

Recebe as requisições HTTP.

### Apolice Service

Contém as regras de negócio.

### Apolice Repository

Camada de persistência.

### Document Module

Gerenciamento documental.

### Notification Module

Notificações.

### Audit Module

Auditoria.

### KPI Module

Indicadores e dashboards.

### Integrações

- Sinistro Integration
- Seguradora Integration

## Diagrama

```mermaid
flowchart TB

subgraph Apolice["Componente Apólice"]
style Apolice fill:none,stroke:#1565C0,stroke-width:2px,stroke-dasharray: 8 4

Handler["Apolice Handler"]

DTO["DTOs"]

Service["Apolice Service"]

Repository["Apolice Repository"]

Audit["Audit Module"]

Notification["Notification Module"]

Sinistro["Sinistro Integration"]

Seguradora["Seguradora Integration"]

Handler --> DTO

DTO --> Service

Service --> Repository

Service --> Audit

Service --> Notification

Service --> Sinistro

Service --> Seguradora

end

Database[("Banco de Dados Principal")]

Repository --> Database

style Handler fill:#1976D2,color:#fff
style DTO fill:#1976D2,color:#fff
style Service fill:#1976D2,color:#fff
style Repository fill:#1976D2,color:#fff
style Audit fill:#1976D2,color:#fff
style Notification fill:#1976D2,color:#fff
style Sinistro fill:#1976D2,color:#fff
style Seguradora fill:#1976D2,color:#fff

style Database fill:#BDBDBD,color:#fff
```
# Nível 4 — Código

## Objetivo

Este nível detalha o componente Apolice Service, núcleo das regras de negócio da aplicação.

## Diagrama

```mermaid
classDiagram

class ApoliceHandler{
+Create()
+Update()
+Delete()
+FindById()
+List()
}

class ApoliceDTO{
+CreateApoliceDTO
+UpdateApoliceDTO
+ResponseDTO
}

class ApoliceService{
+CreateApolice()
+UpdateApolice()
+RenewApolice()
+ValidateCoverage()
}

class ApoliceRepository{
+Save()
+Update()
+Delete()
+FindById()
+List()
}

class Apolice{
+id
+numero
+vigencia
+status
}

class AuditModule{
+RegisterLog()
}

class NotificationModule{
+SendNotification()
}

class SeguradoraIntegration{
+ValidateCoverage()
}

class SinistroIntegration{
+RegistrarSinistro()
+ConsultarHistorico()
+ConsultarStatus()
}

class Database{
+PersistData()
}

ApoliceHandler --> ApoliceDTO
ApoliceHandler --> ApoliceService

ApoliceService --> ApoliceRepository
ApoliceService --> AuditModule
ApoliceService --> NotificationModule
ApoliceService --> SeguradoraIntegration
ApoliceService --> SinistroIntegration

ApoliceRepository --> Apolice
ApoliceRepository --> Database
```

---

---

# Fechamento

A modelagem arquitetural utilizando o C4 Model permite melhor compreensão em relação ao Sistema de Seguros.


