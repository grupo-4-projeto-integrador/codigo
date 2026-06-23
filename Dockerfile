# Estágio 1: Build do Frontend (Vite/React)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Instalar dependências
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copiar código e compilar
COPY frontend/ ./
# A API vai estar na mesma URL, então a base URL pode ser configurada ou deixada como default (/api)
RUN npm run build

# Estágio 2: Build do Backend (Go)
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app/backend

# Preparar dependências
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copiar fonte e compilar
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o api-server ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o migrate ./cmd/migrate

# Estágio 3: Imagem Final
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app

# Copiar binários e migrações do backend
COPY --from=backend-builder /app/backend/api-server .
COPY --from=backend-builder /app/backend/migrate .
COPY --from=backend-builder /app/backend/migrations ./migrations

# Copiar a build do frontend para a pasta esperada pelo backend
# (No backend, a pasta padrão é configurável ou assume "../frontend/dist" se FRONTEND_DIR não for passado,
# mas vamos configurar o FRONTEND_DIR como ./dist no render.yaml, então copiamos para /app/dist)
COPY --from=frontend-builder /app/frontend/dist ./dist

# Variável de ambiente garantindo que o backend sabe onde procurar o frontend
ENV FRONTEND_DIR=./dist

EXPOSE 8080
CMD ["./api-server"]
