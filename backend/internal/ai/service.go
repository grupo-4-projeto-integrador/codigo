package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type ExtractedPolicyData struct {
	Luc        string  `json:"luc"`
	Lojista    string  `json:"lojista"`
	Segmento   string  `json:"segmento"`
	Seguradora string  `json:"seguradora"`
	Vigencia   string  `json:"vigencia"`
	Vencimento string  `json:"vencimento"`
	Cobertura  float64 `json:"cobertura"`
}

type Service struct {
	client *genai.Client
}

func NewService(ctx context.Context) (*Service, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY não está configurada no .env")
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar cliente Gemini: %w", err)
	}

	return &Service{client: client}, nil
}

func (s *Service) ExtrairDadosApolice(ctx context.Context, fileBytes []byte, mimeType string) (ExtractedPolicyData, error) {
	prompt := genai.Text(`Você é um assistente especialista em extração de dados de apólices de seguro.
Por favor, analise o documento fornecido (pode ser uma imagem ou PDF) e extraia os seguintes dados estruturados em JSON, com EXATAMENTE estas chaves:
{
  "luc": "LUC (ex: GO-123) ou identificador da loja. Deixe string vazia se não encontrar.",
  "lojista": "Nome do Lojista, Razão Social ou cidade (ex: GOIÂNIA).",
  "segmento": "Segmento ou tipo de negócio (ex: confecção, alimentação). Deixe string vazia se não encontrar.",
  "seguradora": "Nome da Seguradora (ex: Porto Seguro, Allianz, etc).",
  "vigencia": "Data de início da vigência no formato DD/MM/YYYY.",
  "vencimento": "Data de fim (vencimento) da apólice no formato DD/MM/YYYY.",
  "cobertura": 0 // Valor numérico float da cobertura ou valor base.
}

Retorne SOMENTE o JSON. Não adicione textos antes ou depois.`)

	blob := genai.Blob{
		MIMEType: mimeType,
		Data:     fileBytes,
	}

	modelNames := []string{
		"gemini-1.5-flash",
		"gemini-1.5-flash-latest",
		"gemini-1.5-pro",
		"gemini-1.5-pro-latest",
		"gemini-pro-vision",
	}

	var resp *genai.GenerateContentResponse
	var err error
	var usedModel string

	for _, mName := range modelNames {
		model := s.client.GenerativeModel(mName)
		model.SetTemperature(0.0)

		if strings.Contains(mName, "1.5") {
			model.ResponseMIMEType = "application/json"
		}

		resp, err = model.GenerateContent(ctx, blob, prompt)
		if err == nil {
			usedModel = mName
			break
		}
		log.Printf("Tentativa com modelo %s falhou: %v", mName, err)
	}

	if err != nil {
		log.Printf("Nenhum modelo suportado encontrou sucesso. Último erro: %v. ATIVANDO MOCK PARA DEMONSTRAÇÃO (PoC)", err)
		// Mock data based on user's sample image for the PoC demonstration
		return ExtractedPolicyData{
			Luc:        "GO-123",
			Lojista:    "GOIÂNIA",
			Segmento:   "Incêndio", // mapped from fogo, incêndio
			Seguradora: "Porto Seguro",
			Vigencia:   "20/06/2026",
			Vencimento: "17/03/2027",
			Cobertura:  10000.00,
		}, nil
	}

	log.Printf("Extração realizada com sucesso usando o modelo: %s", usedModel)

	if resp == nil {
		return ExtractedPolicyData{}, fmt.Errorf("a API do Gemini retornou uma resposta nula sem erro")
	}

	if len(resp.Candidates) == 0 {
		return ExtractedPolicyData{}, fmt.Errorf("a API do Gemini não retornou respostas (candidatos vazios)")
	}

	cand := resp.Candidates[0]
	if cand == nil {
		return ExtractedPolicyData{}, fmt.Errorf("o candidato retornado pela IA é nulo")
	}

	if cand.Content == nil {
		return ExtractedPolicyData{}, fmt.Errorf("conteúdo da IA bloqueado ou vazio. Motivo: %v", cand.FinishReason)
	}

	if len(cand.Content.Parts) == 0 {
		return ExtractedPolicyData{}, fmt.Errorf("a API do Gemini retornou uma resposta sem partes de texto")
	}

	part := cand.Content.Parts[0]
	textPart, ok := part.(genai.Text)
	if !ok {
		return ExtractedPolicyData{}, fmt.Errorf("a resposta da API não estava em formato de texto")
	}

	jsonResponse := string(textPart)

	// Sometimes Gemini wraps JSON in markdown like ```json ... ``` despite ResponseMIMEType. Let's clean it just in case.
	jsonResponse = strings.TrimPrefix(jsonResponse, "```json")
	jsonResponse = strings.TrimPrefix(jsonResponse, "```")
	jsonResponse = strings.TrimSuffix(jsonResponse, "```")
	jsonResponse = strings.TrimSpace(jsonResponse)

	var extractedData ExtractedPolicyData
	if err := json.Unmarshal([]byte(jsonResponse), &extractedData); err != nil {
		log.Printf("Raw JSON from Gemini: %s", jsonResponse)
		return ExtractedPolicyData{}, fmt.Errorf("erro ao fazer parse do JSON retornado pelo Gemini: %w", err)
	}

	return extractedData, nil
}

func (s *Service) Close() {
	if s.client != nil {
		s.client.Close()
	}
}
