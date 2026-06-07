package auth

import "time"

type Usuario struct {
	ID        int       `json:"id"`
	Nome      string    `json:"nome"`
	Email     string    `json:"email"`
	SenhaHash string    `json:"-"`
	Role      string    `json:"role"`
	AvatarURL string    `json:"avatar_url,omitempty"`
	Ativo     bool      `json:"ativo"`
	CreatedAt time.Time `json:"created_at"`
}
