package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTP      HTTPConfig
	Postgres  PostgresConfig
	Frontend  FrontendConfig
	JWTSecret string
}

type HTTPConfig struct {
	Port string
}

type PostgresConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type FrontendConfig struct {
	Dir string
}

func Load() (Config, error) {
	_ = godotenv.Load() // Ignore error if .env doesn't exist

	cfg := Config{
		HTTP: HTTPConfig{
			Port: getEnv("PORT", "8082"),
		},
		Postgres: PostgresConfig{
			Host:     getEnv("PG_HOST", "localhost"),
			Port:     getEnv("PG_PORT", "5432"),
			User:     getEnv("PG_USER", "postgres"),
			Password: os.Getenv("PG_PASSWORD"),
			DBName:   getEnv("PG_DBNAME", "seguros_db"),
			SSLMode:  getEnv("PG_SSLMODE", "disable"),
		},
		Frontend: FrontendConfig{
			Dir: getEnv("FRONTEND_DIR", filepath.Join("..", "frontend", "dist")),
		},
		JWTSecret: getEnv("JWT_SECRET", "flamboyant-seguros-secret-2024"),
	}

	if cfg.Postgres.Password == "" && os.Getenv("DATABASE_URL") == "" {
		return Config{}, fmt.Errorf("PG_PASSWORD is not set; set environment variables or create a .env file based on .env.example")
	}

	return cfg, nil
}

func (c Config) Addr() string {
	if c.HTTP.Port == "" {
		return "localhost:8082"
	}
	return "localhost:" + c.HTTP.Port
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
