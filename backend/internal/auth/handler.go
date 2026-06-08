package auth

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"grupo4/seguros/internal/audit"
	"grupo4/seguros/internal/middleware"
	"grupo4/seguros/pkg/response"
)

// Handler contém as dependências do módulo auth.
type Handler struct {
	db       *sql.DB
	auditSvc *audit.Service
	secret   string
}

// NewHandler cria um handler de autenticação.
func NewHandler(db *sql.DB, auditSvc *audit.Service, secret string) *Handler {
	return &Handler{db: db, auditSvc: auditSvc, secret: secret}
}

// Login — POST /api/auth/login
// Valida email e senha via bcrypt e retorna um JWT com claims user_id, email, role.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodPost {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
		return
	}

	if req.Email == "" || req.Senha == "" {
		_ = response.Fail(w, http.StatusBadRequest, "Email e senha são obrigatórios", requestID, nil)
		return
	}

	// Buscar o usuário e verificar a senha via bcrypt em uma única query SQL
	var u Usuario
	var avatarURL sql.NullString
	err := h.db.QueryRow(`
		SELECT id, nome, email, role, avatar_url, ativo
		FROM usuarios
		WHERE email = $1
		  AND ativo = true
		  AND (senha_hash = crypt($2, senha_hash))
	`, req.Email, req.Senha).Scan(&u.ID, &u.Nome, &u.Email, &u.Role, &avatarURL, &u.Ativo)

	if err == sql.ErrNoRows {
		// Credenciais inválidas — não revelar qual campo está errado
		_ = response.Fail(w, http.StatusUnauthorized, "Email ou senha inválidos", requestID, nil)
		return
	}
	if err != nil {
		log.Printf("Login: erro ao consultar usuário: %v", err)
		_ = response.Fail(w, http.StatusInternalServerError, "Erro interno ao autenticar", requestID, nil)
		return
	}

	if avatarURL.Valid {
		u.AvatarURL = avatarURL.String
	}

	// Gerar JWT com expiração de 8 horas
	claims := jwt.MapClaims{
		"user_id": u.ID,
		"email":   u.Email,
		"role":    u.Role,
		"exp":     time.Now().Add(8 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(h.secret))
	if err != nil {
		log.Printf("Login: erro ao gerar token: %v", err)
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao gerar token", requestID, nil)
		return
	}

	if h.auditSvc != nil {
		h.auditSvc.LogFromRequest(r, "login", "sessao", strconv.Itoa(u.ID), nil, nil)
	}

	_ = response.Success(w, http.StatusOK, LoginResponse{
		Token: tokenStr,
		Usuario: UsuarioDTO{
			ID:        u.ID,
			Nome:      u.Nome,
			Email:     u.Email,
			Role:      u.Role,
			AvatarURL: u.AvatarURL,
		},
	}, requestID)
}

// Me — GET /api/auth/me
// Retorna os dados do usuário autenticado com base no token JWT.
// Deve ser usado após AuthMiddleware.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	userID := UserIDFromContext(r.Context())
	if userID == 0 {
		_ = response.Fail(w, http.StatusUnauthorized, "Não autenticado", requestID, nil)
		return
	}

	var u Usuario
	var avatarURL sql.NullString
	err := h.db.QueryRow(`
		SELECT id, nome, email, role, avatar_url, ativo
		FROM usuarios
		WHERE id = $1 AND ativo = true
	`, userID).Scan(&u.ID, &u.Nome, &u.Email, &u.Role, &avatarURL, &u.Ativo)

	if err == sql.ErrNoRows {
		_ = response.Fail(w, http.StatusNotFound, "Usuário não encontrado", requestID, nil)
		return
	}
	if err != nil {
		log.Printf("Me: erro ao buscar usuário %d: %v", userID, err)
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao buscar usuário", requestID, nil)
		return
	}

	if avatarURL.Valid {
		u.AvatarURL = avatarURL.String
	}

	_ = response.Success(w, http.StatusOK, UsuarioDTO{
		ID:        u.ID,
		Nome:      u.Nome,
		Email:     u.Email,
		Role:      u.Role,
		AvatarURL: u.AvatarURL,
	}, requestID)
}
