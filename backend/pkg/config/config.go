package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTP               HTTPConfig
	Postgres           PostgresConfig
	Frontend           FrontendConfig
	JWTSecret          string
	JWTExpirationHours int
	GeminiAPIKey       string // loaded from GEMINI_API_KEY; never logged or exposed
	AllowedOrigins     []string
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
		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTExpirationHours: getEnvAsInt("JWT_EXPIRATION_HOURS", 8),
		GeminiAPIKey:       os.Getenv("GEMINI_API_KEY"),
	}

	originsStr := getEnv("ALLOWED_ORIGINS", "")
	if originsStr != "" {
		for _, o := range strings.Split(originsStr, ",") {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, strings.TrimSpace(o))
		}
	}

	if len(cfg.JWTSecret) < 32 {
		return Config{}, fmt.Errorf("JWT_SECRET is missing or too weak; must be at least 32 characters long. Set it in the environment variables or .env file")
	}

	if cfg.Postgres.Password == "" && os.Getenv("DATABASE_URL") == "" {
		return Config{}, fmt.Errorf("PG_PASSWORD is not set; set environment variables or create a .env file based on .env.example")
	}

	return cfg, nil
}

func (c Config) Addr() string {
	if c.HTTP.Port == "" {
		return ":8082"
	}
	return ":" + c.HTTP.Port
}

// String implementa fmt.Stringer redatando todos os campos secretos.
// Impede que log.Printf("%v", cfg) ou fmt.Println(cfg) exponha chaves.
func (c Config) String() string {
	return fmt.Sprintf("Config{Port:%s, PG:%s@%s/%s, JWT:[REDACTED], Gemini:[REDACTED]}",
		c.HTTP.Port, c.Postgres.User, c.Postgres.Host, c.Postgres.DBName)
}

// GoString implementa fmt.GoStringer para redatar segredos em %#v também.
func (c Config) GoString() string { return c.String() }

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if parsedValue, err := strconv.Atoi(value); err == nil {
			return parsedValue
		}
	}
	return fallback
}
