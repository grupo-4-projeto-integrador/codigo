import { useState, useEffect } from 'react';
import { request } from "../api/client";
import { getHealthScore } from "../api/apolice";

type KPIHistoryPoint = { label: string; value: number; };
type KPIHistoryResponse = { metric: string; total: number; current: number; weekly_change_percent: number; points: KPIHistoryPoint[]; };

export function usePresentationData() {
  const [allPolicies, setAllPolicies] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<{ score: number, delta: number } | null>(null);
  const [conformesHistory, setConformesHistory] = useState<KPIHistoryResponse | null>(null);
  const [vencidasHistoryData, setVencidasHistoryData] = useState<KPIHistoryResponse | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [selectedMapLuc, setSelectedMapLuc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    request<any[]>('/apolices').then(data => {
      if(active) { setAllPolicies(data || []); setLastSyncTime(new Date()); }
    }).catch(console.error);

    getHealthScore().then(data => {
      if(active) setHealthScore(data);
    }).catch(console.error);

    request<KPIHistoryResponse>('/kpis/history?metric=conformes&weeks=8').then(data => {
      if(active) setConformesHistory(data);
    }).catch(console.error);

    request<KPIHistoryResponse>('/kpis/history?metric=vencidas&weeks=8').then(data => {
      if(active) setVencidasHistoryData(data);
    }).catch(console.error);

    return () => { active = false; };
  }, []);

  const activePolicies = allPolicies.filter((p) => (p.status ?? "").toLowerCase() === "ativa" || (p.status ?? "").toLowerCase() === "conforme").length;
  const expiringPolicies = allPolicies.filter((p) => (p.status ?? "").toLowerCase() === "a vencer").length;
  const expiredPolicies = allPolicies.filter((p) => (p.status ?? "").toLowerCase() === "vencida").length;
  const totalPolicies = allPolicies.length;

  const percAVencer = totalPolicies ? Math.round((expiringPolicies / totalPolicies) * 100) : 0;
  const percVencidas = totalPolicies ? Math.round((expiredPolicies / totalPolicies) * 100) : 0;
  const totalCobertura = allPolicies.reduce((acc, p) => acc + (Number(p.cobertura) || 0), 0);

  const conformidadeCount = conformesHistory?.current ?? activePolicies;
  const conformidadeTotal = conformesHistory?.total ?? totalPolicies;
  const complianceRate = conformidadeTotal > 0 ? (conformidadeCount / conformidadeTotal) * 100 : 0;
  const weeklyVariation = conformesHistory?.weekly_change_percent ?? 0;

  const sparklineValues = conformesHistory?.points?.length ? conformesHistory.points.map(p => p.value) : Array.from({ length: 8 }, () => conformidadeCount);
  const vencidasHistory = vencidasHistoryData?.points?.length ? vencidasHistoryData.points.map(p => p.value) : Array.from({ length: 8 }, () => expiredPolicies);
  const expiringSparklineValues = Array.from({ length: 8 }, () => expiringPolicies);

  const buildSparklinePath = (values: number[]) => {
    if (!values || values.length === 0) return { line: "", area: "", values: [] };
    const width = 280, height = 44, minY = 36, maxY = 8;
    const minValue = Math.min(...values), maxValue = Math.max(...values);
    const range = Math.max(maxValue - minValue, 1);
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;

    const points = values.map((val, idx) => {
      const normalized = (val - minValue) / range;
      const y = minY - normalized * (minY - maxY);
      return { x: idx * stepX, y };
    });

    const line = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L 280 44 L 0 44 Z`;
    return { line, area, values };
  };

  return {
    complianceRate, totalPolicies, expiringPolicies, percAVencer,
    expiredPolicies, percVencidas, totalCobertura, weeklyVariation,
    healthScore, lastSyncTime, selectedMapLuc, setSelectedMapLuc,
    sparklines: {
      compliance: buildSparklinePath(sparklineValues),
      expiring: buildSparklinePath(expiringSparklineValues),
      expired: buildSparklinePath(vencidasHistory)
    }
  };
}
