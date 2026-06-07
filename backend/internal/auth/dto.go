package auth

// LoginRequest é o payload do POST /api/auth/login.
type LoginRequest struct {
	Email string `json:"email"`
	Senha string `json:"senha"`
}

// LoginResponse é retornado após autenticação bem-sucedida.
type LoginResponse struct {
	Token   string     `json:"token"`
	Usuario UsuarioDTO `json:"usuario"`
}

// UsuarioDTO é a representação pública do usuário (sem senha).
type UsuarioDTO struct {
	ID        int    `json:"id"`
	Nome      string `json:"nome"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	AvatarURL string `json:"avatar_url,omitempty"`
}
