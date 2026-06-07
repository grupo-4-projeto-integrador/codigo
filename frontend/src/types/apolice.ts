export type ApoliceFormData = {
  luc: string;
  fantasia: string;
  segmento: string;
  seguradora: string;
  vigencia: string;
  vencimento: string;
};

export type ApoliceDTO = {
  luc: string;
  fantasia: string;
  segmento: string;
  seguradora: string;
  vigencia: string;
  vencimento: string;
  cobertura?: number;
  dias_restantes?: number;
  responsavel?: string;
  responsavel_id?: number;
  observacoes?: string;
};

export type ApoliceRecord = ApoliceFormData & {
  id: string;
  lojista: string;
  tipo: string;
  status: string;
  dias_restantes?: number;
  cobertura?: string;
  premio?: string;
  observacoes?: string;
  responsavel?: string;
  responsavel_id?: number;
};

export type Gravidade = 'alta' | 'media' | 'baixa';

export interface Sinistro {
  tipo: string;
  gravidade: Gravidade;
  dataResolucao: string;
  valorIndenizacao: number;
  franquia: number;
  loja: string;
  regulador: string;
  dataCriacao: string;
}

export type InsuranceListProps = {
  policies: ApoliceRecord[];
  colors: any;
  isDarkMode: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onOpenDeleteConfirm: (id: string) => void;
};

export type InsuranceTableHeaderProps = {
  colors: any;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
};
