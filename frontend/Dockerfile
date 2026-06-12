FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# Build stage
FROM node:18-alpine AS builder 
WORKDIR /app
# Enable corepack
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

# Final stage
# O build do Vite escreve para ../backend/static/dist (conforme vite.config.ts)
# copiar a saída correta do estágio builder
FROM nginx:alpine
COPY --from=builder /backend/static/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
