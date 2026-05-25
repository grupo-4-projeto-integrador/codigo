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
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
