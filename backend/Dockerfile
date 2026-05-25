# backend/Dockerfile — linha 1
FROM golang:1.26-alpine AS builder
WORKDIR /app
# Prepare dependencies
COPY go.mod go.sum ./
RUN go mod download
# Copy source
COPY . .
# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -o api-server ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o migrate ./cmd/migrate

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/api-server .
COPY --from=builder /app/migrate .
COPY --from=builder /app/migrations ./migrations
EXPOSE 8082
CMD ["./api-server"]
