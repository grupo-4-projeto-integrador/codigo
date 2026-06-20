export interface PitchSlide {
  id: string;
  title: string;
  content: string;
  route?: string;
}

export const PITCH_SLIDES: PitchSlide[] = [
  {
    id: "health-score",
    title: "1. Health Score Global",
    content: "O painel principal fornece um número consolidado que resume a saúde de todo o portfólio, permitindo uma análise imediata de risco.",
    route: "/seguros"
  },
  {
    id: "barra-pesquisa",
    title: "2. Barra de Pesquisa",
    content: "Encontre apólices, filiais ou segurados rapidamente usando a busca global integrada, projetada para alta performance.",
    route: "/seguros"
  },
  {
    id: "filtros",
    title: "3. Filtros Avançados",
    content: "Refine a visualização aplicando filtros por segmento, status e localidade. O mapa e a tabela reagem em tempo real.",
    route: "/seguros"
  },
  {
    id: "download-inteligente",
    title: "4. Download Inteligente",
    content: "Exporte relatórios consolidados no formato ideal (PDF, CSV, Excel) com um clique, sem gargalos na extração de dados.",
    route: "/seguros"
  },
  {
    id: "snapshot",
    title: "5. Snapshot Operacional",
    content: "Um resumo instantâneo da visualização atual. Ferramenta crucial para auditoria e prestação de contas diária.",
    route: "/seguros"
  },
  {
    id: "relatorio-ia",
    title: "6. Análise de IA",
    content: "A IA processa anomalias nas apólices e gera diagnósticos preditivos de riscos antes que eles se materializem.",
    route: "/seguros"
  },
  {
    id: "novo-wizard",
    title: "7. Nova Apólice (Wizard)",
    content: "Uma jornada simplificada em formato de assistente que valida dados de entrada e guia o usuário no cadastro da apólice.",
    route: "/seguros"
  },
  {
    id: "kpis",
    title: "8. Os 4 KPIs Principais",
    content: "Visão rápida do volume segurado, prêmios, franquias abertas e sinistralidade. Dados essenciais sempre na sua visão periférica.",
    route: "/seguros"
  },
  {
    id: "fila-acao",
    title: "9. Fila de Ação",
    content: "Tarefas urgentes como renovações próximas e endossos pendentes são empurrados automaticamente para a Fila de Ação.",
    route: "/seguros"
  },
  {
    id: "mapa-conformidade",
    title: "10. Mapa de Conformidade (LUC)",
    content: "Mapa geográfico de riscos (LUC). Renove, edite e acompanhe pendências clicando nos pins coloridos.",
    route: "/seguros"
  },
  {
    id: "risco-segmento",
    title: "11. Risco por Segmento",
    content: "Divisão do valor exposto de acordo com a vertente de negócio, essencial para o rebalanceamento da carteira de seguros.",
    route: "/seguros"
  },
  {
    id: "tabelas",
    title: "12. Tabela Normal e Fullscreen",
    content: "Opere com dados brutos. Se a lista crescer muito, ative a 'Tabela Fullscreen' para ter uma experiência focada focada em produtividade.",
    route: "/seguros"
  },
  {
    id: "atividade-recente",
    title: "13. Atividade Recente",
    content: "Log das últimas interações globais. Saiba imediatamente o que sua equipe subiu, baixou ou renovou no dia.",
    route: "/seguros"
  },
  {
    id: "audit-log",
    title: "14. Audit Log",
    content: "Rastreabilidade irrestrita. Acesse o modal de Logs e veja todos os acessos e mudanças feitos com carimbo de tempo inviolável.",
    route: "/seguros"
  },
  {
    id: "usuarios",
    title: "15. Gestão de Usuários",
    content: "Adicione ou remova membros da equipe com hierarquia de Roles. Garantia de controle e compliance interno.",
    route: "/seguros"
  },
  {
    id: "command-palette",
    title: "16. Command Palette",
    content: "Atalhos avançados (Ctrl+K). Navegue por telas ou execute funções rapidamente como um Power User.",
    route: "/seguros"
  },
  {
    id: "modo-apresentacao",
    title: "17. Modo Apresentação (TV)",
    content: "Para a sala de reunião. Apenas KPIs limpos. Se houver dúvidas, basta clicar nos cards para abrir os detalhes granulares.",
    route: "/apresentacao"
  },
  {
    id: "graph-view",
    title: "18. Graph View",
    content: "Teia de conexões interativas. Descubra dependências ocultas e conflitos de interesse através do grafo dinâmico.",
    route: "/graph"
  }
];

let isActive = false;
let isMinimized = false;
let currentIndex = 0;
let slides = [...PITCH_SLIDES];

const pitchListeners = new Set<() => void>();

export const getPitchState = () => ({ isActive, isMinimized, currentIndex, slides });

export const setPitchActive = (active: boolean) => {
  isActive = active;
  if (active && currentIndex >= slides.length) {
    currentIndex = 0;
  }
  if (!active) {
    isMinimized = false; // resetar
  }
  pitchListeners.forEach((l) => l());
};

export const setPitchMinimized = (minimized: boolean) => {
  isMinimized = minimized;
  pitchListeners.forEach((l) => l());
};

export const nextPitchSlide = () => {
  if (!isActive) return;
  if (currentIndex < slides.length - 1) {
    currentIndex++;
    pitchListeners.forEach((l) => l());
  }
};

export const prevPitchSlide = () => {
  if (!isActive) return;
  if (currentIndex > 0) {
    currentIndex--;
    pitchListeners.forEach((l) => l());
  }
};

export const resetPitch = () => {
  isActive = false;
  isMinimized = false;
  currentIndex = 0;
  pitchListeners.forEach((l) => l());
};

export const subscribePitchState = (listener: () => void) => {
  pitchListeners.add(listener);
  return () => pitchListeners.delete(listener);
};
