//go:build smoke

package main_test

import (
	"bytes"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

func TestSmokeIntegration(t *testing.T) {
	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8082"
	}

	payload := []byte(`{"luc":"SMOKE1","loja":"Smoke Test","segmento":"TEST","seguradora":"TestIns","vigencia":"2024-01-01","vencimento":"2026-12-31"}`)

	_ = godotenv.Load(".env")
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "test_secret_for_ci_environment_must_be_32_chars"
	}
	claims := jwt.MapClaims{
		"user_id": 1,
		"email":   "admin@teste.com",
		"role":    "admin",
		"exp":     time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(secret))

	req, err := http.NewRequest("POST", apiURL+"/api/apolices", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("Falha ao criar requisição: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenStr)

	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("Falha na requisição POST: %v\n(O servidor está rodando em %s?)", err, apiURL)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusCreated && res.StatusCode != http.StatusOK {
		t.Errorf("Esperado status 200 ou 201, obteve %d", res.StatusCode)
	}
}
