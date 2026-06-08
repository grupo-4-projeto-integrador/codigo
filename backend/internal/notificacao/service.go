package notificacao

type Service struct {
	repo *PostgresRepository
}

func NewService(repo *PostgresRepository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetNotificacoes(usuarioID int) ([]Notificacao, error) {
	// 1. Sincroniza primeiro
	if err := s.repo.SyncNotificacoes(usuarioID); err != nil {
		return nil, err
	}
	// 2. Retorna a lista
	list, err := s.repo.GetNotificacoes(usuarioID)
	if list == nil {
		list = []Notificacao{} // return empty array instead of null
	}

	// 3. Atividade da equipe
	equipe, errEquipe := s.repo.GetAtividadeEquipe(usuarioID)
	if errEquipe == nil && len(equipe) > 0 {
		list = append(list, equipe...)
	}

	return list, err
}

func (s *Service) MarcarTodasLidas(usuarioID int) error {
	return s.repo.MarcarTodasLidas(usuarioID)
}

func (s *Service) ArquivarLidas(usuarioID int) error {
	return s.repo.ArquivarLidas(usuarioID)
}

func (s *Service) ArquivarUnica(usuarioID int, id int) error {
	return s.repo.ArquivarUnica(usuarioID, id)
}
