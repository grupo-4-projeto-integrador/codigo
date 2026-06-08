package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

func main() {
	payload := []byte(`{"luc":"SMOKE2","loja":"Smoke Test","segmento":"TEST","seguradora":"TestIns","vigencia":"2024-01-01","vencimento":"2026-12-31"}`)
	res, err := http.Post("http://localhost:8086/api/apolices", "application/json", bytes.NewReader(payload))
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Printf("Status: %d\nBody: %s\n", res.StatusCode, string(body))
}
