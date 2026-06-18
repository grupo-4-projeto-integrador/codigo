package relatorio

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// Handler agrupa os handlers HTTP do pacote relatorio.
// A geminiAPIKey é injetada no construtor — nunca lida do ambiente em tempo de request.
type Handler struct {
	geminiAPIKey string
}

// NewHandler cria uma nova instância de Handler com a chave do Gemini injetada.
// Se geminiAPIKey for vazia, o endpoint retornará 503 sem expor detalhes internos.
func NewHandler(geminiAPIKey string) *Handler {
	return &Handler{geminiAPIKey: geminiAPIKey}
}

// GerarRelatorio recebe dados do dashboard, monta um prompt e chama o Gemini
// para gerar um relatório executivo em português.
func (h *Handler) GerarRelatorio(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	// Vetor 3: chave nunca vem do ambiente em runtime — foi injetada no construtor.
	if h.geminiAPIKey == "" {
		// Vetor 4: não logar a ausência de chave com detalhes que possam vazar
		// o nome ou valor da variável de ambiente.
		http.Error(w, "serviço de IA indisponível", http.StatusServiceUnavailable)
		return
	}

	var dados DadosDashboard
	if err := json.NewDecoder(r.Body).Decode(&dados); err != nil {
		http.Error(w, "payload inválido", http.StatusBadRequest)
		return
	}

	prompt := montarPrompt(dados)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	// Vetor 3: option.WithAPIKey recebe a chave em memória — nunca do os.Getenv aqui.
	client, err := genai.NewClient(ctx, option.WithAPIKey(h.geminiAPIKey))
	if err != nil {
		// Vetor 4: logar o erro internamente sem incluir a chave.
		http.Error(w, "erro ao inicializar serviço de IA", http.StatusInternalServerError)
		return
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")
	model.SetTemperature(0.7)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		http.Error(w, "erro ao gerar relatório", http.StatusInternalServerError)
		return
	}

	texto := extrairTexto(resp)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"relatorio": texto})
}

func montarPrompt(d DadosDashboard) string {
	return fmt.Sprintf(`Você é um analista sênior de seguros corporativos do Shopping %s.
Gere um relatório executivo conciso em português brasileiro com estas seções:

1. DIAGNÓSTICO ATUAL (2 parágrafos)
2. RISCOS PRIORITÁRIOS (lista com valores financeiros)
3. RECOMENDAÇÕES (ordenadas por urgência)
4. PREVISÃO 30 DIAS

Dados atuais:
- Health Score: %d (%+d pontos esta semana)
- Apólices: %d total | %d conformes | %d a vencer | %d vencidas
- Cobertura total: R$ %.1fM
- Segmentos críticos: %s
- Ações urgentes: %s
- Data: %s

Use linguagem executiva direta. Seja quantitativo. Máximo 400 palavras.`,
		d.NomeShopping, d.HealthScore, d.DeltaSemanal,
		d.TotalApolices, d.Conformes, d.AVencer, d.Vencidas,
		d.CoberturaTotalM, d.SegmentosCriticos, d.AcoesUrgentes,
		d.DataReferencia)
}

func extrairTexto(resp *genai.GenerateContentResponse) string {
	if len(resp.Candidates) == 0 {
		return "Sem resposta"
	}
	candidate := resp.Candidates[0]
	if candidate.Content == nil {
		return "Sem conteúdo"
	}
	var texto string
	for _, part := range candidate.Content.Parts {
		if t, ok := part.(genai.Text); ok {
			texto += string(t)
		}
	}
	return texto
}
