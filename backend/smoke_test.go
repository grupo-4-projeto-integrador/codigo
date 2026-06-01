package main_test

import (
	"bytes"
	"net/http"
	"os"
	"testing"
	"time"
)

func TestSmokeIntegration(t *testing.T) {
	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8082"
	}

	payload := []byte(`{"luc":"SMOKE1","loja":"Smoke Test","segmento":"TEST","seguradora":"TestIns","vigencia":"2024-01-01","vencimento":"2026-12-31"}`)

	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Post(apiURL+"/api/apolices", "application/json", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("Falha na requisição POST: %v\n(O servidor está rodando em %s?)", err, apiURL)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusCreated && res.StatusCode != http.StatusOK {
		t.Errorf("Esperado status 200 ou 201, obteve %d", res.StatusCode)
	}
}
