BACKEND_DIR=codigo/backend
FRONTEND_DIR=codigo/frontend

.PHONY: help dev-backend dev-frontend build

help:
	@echo "Available targets:"
	@echo "  dev-backend   Run the Go backend"
	@echo "  dev-frontend  Run the frontend dev server"
	@echo "  build         Build backend and frontend"

dev-backend:
	cd $(BACKEND_DIR) && go run ./cmd/api

dev-frontend:
	cd $(FRONTEND_DIR) && corepack pnpm install && corepack pnpm dev

build:
	cd $(BACKEND_DIR) && go build ./...
	cd $(FRONTEND_DIR) && corepack pnpm install --frozen-lockfile && corepack pnpm build
