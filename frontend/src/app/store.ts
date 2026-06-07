export type ClaimStatus = "Aberto" | "Aguardando Regulador" | "Em Análise" | "Aprovado" | "Pago";
export type ClaimSeverity = "Baixa" | "Média" | "Alta";

export interface Claim {
  id: string;
  store: string;
  type: string;
  severity: ClaimSeverity;
  status: ClaimStatus;
  date: string;
  description: string;
  files: string[];
  regulator?: string;
  indemnityValue?: number;
  deductibleValue?: number; // Franquia
  fraudAlert?: boolean;
}

export const initialClaims: Claim[] = [
  {
    id: "SIN-001",
    store: "Loja 104 - Vestuário",
    type: "Vazamento / Infiltração",
    severity: "Alta",
    status: "Aberto",
    date: "2026-04-06",
    description: "Rompimento de cano na laje superior causando alagamento no estoque da loja.",
    files: ["foto1.jpg", "laudo_bombeiros.pdf"],
    fraudAlert: false,
  },
  {
    id: "SIN-002",
    store: "Loja 210 - Eletrônicos",
    type: "Pico de Energia",
    severity: "Média",
    status: "Aguardando Regulador",
    date: "2026-04-05",
    description: "Curto circuito no quadro de distribuição, queima de 3 computadores e 1 monitor vitrine.",
    files: [],
    fraudAlert: true,
  },
  {
    id: "SIN-003",
    store: "Praça de Alimentação",
    type: "Incêndio",
    severity: "Alta",
    status: "Em Análise",
    date: "2026-04-01",
    description: "Princípio de incêndio na coifa do restaurante 05.",
    files: ["vistoria_tecnica.pdf"],
    regulator: "Carlos Mendes (Susep 1234)",
    fraudAlert: false,
  },
  {
    id: "SIN-004",
    store: "Quiosque 12 - Joias",
    type: "Dano Físico / Vandalismo",
    severity: "Baixa",
    status: "Pago",
    date: "2026-03-25",
    description: "Vidro do expositor trincado durante a madrugada.",
    files: ["camera_seguranca.mp4"],
    regulator: "Ana Souza (Susep 9876)",
    indemnityValue: 4500,
    deductibleValue: 500,
    fraudAlert: false,
  }
];

// Simple in-memory store for prototype
let claims = [...initialClaims];

export const getClaims = () => claims;
export const getClaimById = (id: string) => claims.find(c => c.id === id);
export const addClaim = (claim: Claim) => {
  claims.unshift(claim);
};
export const updateClaim = (id: string, updates: Partial<Claim>) => {
  claims = claims.map(c => c.id === id ? { ...c, ...updates } : c);
};

let selectedApoliceLuc = "";
const selectedApoliceLucListeners = new Set<() => void>();

export const getSelectedApoliceLuc = () => selectedApoliceLuc;

export const setSelectedApoliceLuc = (luc: string) => {
  selectedApoliceLuc = luc;
  selectedApoliceLucListeners.forEach((listener) => listener());
};

export const subscribeSelectedApoliceLuc = (listener: () => void) => {
  selectedApoliceLucListeners.add(listener);

  return () => {
    selectedApoliceLucListeners.delete(listener);
  };
};

// ── Map dim filters ──────────────────────────────────────────────────────────
let filtroSegmento = "";
let filtroSeguradora = "";
let filtroStatus = "";
const mapFilterListeners = new Set<() => void>();

export const getMapFilters = () => ({ filtroSegmento, filtroSeguradora, filtroStatus });

export const setMapFilters = (segmento: string, seguradora: string, status: string) => {
  filtroSegmento = segmento;
  filtroSeguradora = seguradora;
  filtroStatus = status;
  mapFilterListeners.forEach((l) => l());
};

export const subscribeMapFilters = (listener: () => void) => {
  mapFilterListeners.add(listener);
  return () => mapFilterListeners.delete(listener);
};

// ── Fullscreen Table ──────────────────────────────────────────────────────────
export type FullscreenTableFilter = 'all' | 'conforme' | 'a-vencer' | 'vencida';

let fullscreenTableOpen = false;
let fullscreenTableFilter: FullscreenTableFilter = 'all';
const fullscreenTableListeners = new Set<() => void>();

export const getFullscreenTableOpen = () => fullscreenTableOpen;
export const getFullscreenTableFilter = () => fullscreenTableFilter;

export const setFullscreenTableOpen = (open: boolean) => {
  fullscreenTableOpen = open;
  fullscreenTableListeners.forEach((l) => l());
};

export const setFullscreenTableFilter = (filter: FullscreenTableFilter) => {
  fullscreenTableFilter = filter;
  fullscreenTableListeners.forEach((l) => l());
};

export const subscribeFullscreenTable = (listener: () => void) => {
  fullscreenTableListeners.add(listener);
  return () => fullscreenTableListeners.delete(listener);
};
