package auth

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"grupo4/seguros/internal/middleware"
	"grupo4/seguros/pkg/response"
)

// GetUsuarios (Admin) - GET /api/usuarios
func (h *Handler) GetUsuarios(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	rows, err := h.db.Query(`SELECT id, nome, email, role, avatar_url, ativo, created_at FROM usuarios ORDER BY nome`)
	if err != nil {
		log.Printf("GetUsuarios: erro: %v", err)
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao buscar usuários", requestID, nil)
		return
	}
	defer rows.Close()

	var users []Usuario
	for rows.Next() {
		var u Usuario
		var avatarURL sql.NullString
		if err := rows.Scan(&u.ID, &u.Nome, &u.Email, &u.Role, &avatarURL, &u.Ativo, &u.CreatedAt); err != nil {
			log.Printf("GetUsuarios: erro no scan: %v", err)
			continue
		}
		if avatarURL.Valid {
			u.AvatarURL = avatarURL.String
		}
		users = append(users, u)
	}

	_ = response.Success(w, http.StatusOK, users, requestID)
}

// CreateUsuario (Admin) - POST /api/usuarios
func (h *Handler) CreateUsuario(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodPost {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	var req struct {
		Nome  string `json:"nome"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
		return
	}

	// Senha padrão "Mudar123!"
	err := h.db.QueryRow(`
		INSERT INTO usuarios (nome, email, role, senha_hash) 
		VALUES ($1, $2, $3, crypt('Mudar123!', gen_salt('bf'))) 
		RETURNING id, created_at
	`, req.Nome, req.Email, req.Role).Scan(&req.Nome) // dummy scan just to execute

	if err != nil {
		log.Printf("CreateUsuario: erro: %v", err)
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao criar usuário", requestID, nil)
		return
	}

	_ = response.Success(w, http.StatusOK, map[string]string{"message": "Usuário criado com sucesso"}, requestID)
}

// UpdateUsuario (Admin) - PATCH /api/usuarios/:id
func (h *Handler) UpdateUsuario(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodPatch {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	idStr := r.PathValue("id")
	if idStr == "" {
		idStr = r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:]
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "ID inválido", requestID, nil)
		return
	}

	var req struct {
		Role  *string `json:"role"`
		Ativo *bool   `json:"ativo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
		return
	}

	if req.Role != nil {
		_, err = h.db.Exec(`UPDATE usuarios SET role = $1, updated_at = NOW() WHERE id = $2`, *req.Role, id)
	} else if req.Ativo != nil {
		_, err = h.db.Exec(`UPDATE usuarios SET ativo = $1, updated_at = NOW() WHERE id = $2`, *req.Ativo, id)
	}

	if err != nil {
		log.Printf("UpdateUsuario: erro: %v", err)
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao atualizar usuário", requestID, nil)
		return
	}

	_ = response.Success(w, http.StatusOK, map[string]string{"message": "Usuário atualizado"}, requestID)
}
