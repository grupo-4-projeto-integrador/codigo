package auth

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"grupo4/seguros/pkg/response"
)

type contextKey string

const (
	ContextKeyUserID contextKey = "user_id"
	ContextKeyRole   contextKey = "role"
	ContextKeyEmail  contextKey = "email"
)

// UserIDFromContext extrai o user_id injetado pelo AuthMiddleware.
func UserIDFromContext(ctx context.Context) int {
	v, _ := ctx.Value(ContextKeyUserID).(int)
	return v
}

// RoleFromContext extrai o role injetado pelo AuthMiddleware.
func RoleFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ContextKeyRole).(string)
	return v
}

// AuthMiddleware valida o JWT no header Authorization: Bearer <token>
// e injeta user_id, role e email no contexto da request.
func AuthMiddleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "Bearer ") {
				_ = response.Fail(w, http.StatusUnauthorized, "Token de autenticação necessário", "", nil)
				return
			}

			tokenStr := strings.TrimPrefix(header, "Bearer ")
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				log.Printf("AuthMiddleware: token inválido: %v", err)
				_ = response.Fail(w, http.StatusUnauthorized, "Token inválido ou expirado", "", nil)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				_ = response.Fail(w, http.StatusUnauthorized, "Claims inválidos", "", nil)
				return
			}

			userID := int(claims["user_id"].(float64))
			role, _ := claims["role"].(string)
			email, _ := claims["email"].(string)

			ctx := context.WithValue(r.Context(), ContextKeyUserID, userID)
			ctx = context.WithValue(ctx, ContextKeyRole, role)
			ctx = context.WithValue(ctx, ContextKeyEmail, email)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole retorna um middleware que permite acesso apenas para os roles informados.
// Deve ser usado após AuthMiddleware.
func RequireRole(secret string, roles ...string) func(http.Handler) http.Handler {
	auth := AuthMiddleware(secret)
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}

	return func(next http.Handler) http.Handler {
		// Primeiro valida o JWT via AuthMiddleware
		return auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := RoleFromContext(r.Context())
			if !allowed[role] {
				_ = response.Fail(w, http.StatusForbidden, "Permissão insuficiente para esta operação", "", nil)
				return
			}
			next.ServeHTTP(w, r)
		}))
	}
}
