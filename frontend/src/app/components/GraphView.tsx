import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { listApolices, ApoliceRecord } from '../../api/apolice';
import { X, Siren, CircleDot } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';

const COLORS = {
  vencida: '#c4151f',
  a_vencer: '#BA7517',
  conforme: '#639922',
  sem_status: '#475569',
  hub: '#4ade80', // bright green for hub
  segment: '#94a3b8' // slate gray for segments
};

function getStatusKey(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'vencida') return 'vencida';
  if (s === 'a vencer') return 'a_vencer';
  if (['ativa', 'conforme', 'vigente'].includes(s)) return 'conforme';
  return 'sem_status'; 
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: 'hub' | 'segment' | 'luc';
  label: string;
  radius: number;
  color: string;
  data?: any;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: 'hub-segment' | 'segment-luc';
}

export function GraphView() {
  const navigate = useNavigate();
  const [data, setData] = useState<ApoliceRecord[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<SVGGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<number | null>(null);
  const [crisisMode, setCrisisMode] = useState(false);
  const [proportionalSize, setProportionalSize] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [globalTheme, setGlobalTheme] = useState<'dark' | 'light'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const proportionalSizeRef = useRef(proportionalSize);
  useEffect(() => { proportionalSizeRef.current = proportionalSize; }, [proportionalSize]);

  const rafRef = useRef<number | null>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const animPhaseRef = useRef<'exploding' | 'drawing' | 'settling' | 'idle'>('exploding');
  const animStartRef = useRef<number | null>(null);
  const prevFilterRef = useRef<{ timeline: number | null, crisis: boolean }>({ timeline: null, crisis: false });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setGlobalTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (data.length === 0) {
      listApolices().then(setData);
    }
  }, [data.length]);

  useEffect(() => {
    if (data.length === 0 || !svgRef.current || !wrapperRef.current) return;

    setIsAnimating(true);

    const width = window.innerWidth;
    const height = window.innerHeight;

    const g = d3.select(wrapperRef.current);
    g.selectAll('*').remove();

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        g.selectAll('text').style('opacity', event.transform.k < 0.8 ? 0 : 1);
      });
    d3.select(svgRef.current).call(zoom);

    // Build Graph Data
    const nodes: Node[] = [];
    const links: Link[] = [];

    // 1. Hub
    nodes.push({
      id: 'hub',
      type: 'hub',
      label: 'Seguros',
      radius: 10,
      color: COLORS.hub,
      fx: width / 2,
      fy: height / 2
    });

    // 2. Segments
    const segmentCounts: Record<string, number> = {};
    data.forEach(d => {
      const seg = d.segmento || 'Outros';
      segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
    });
    const counts = Object.values(segmentCounts);
    const maxCount = Math.max(...counts, 1);
    const minCount = Math.min(...counts, 1);

    const getSegmentRadius = (count: number) => {
      if (maxCount === minCount) return 300;
      return 250 + ((count - minCount) / (maxCount - minCount)) * 170;
    };

    const segments = Array.from(new Set(data.map(d => d.segmento || 'Outros')));
    segments.forEach((seg, i) => {
      const count = segmentCounts[seg] || 0;
      const dist = getSegmentRadius(count);
      const angle = (i / segments.length) * 2 * Math.PI - Math.PI / 2;
      nodes.push({
        id: `seg-${seg}`,
        type: 'segment',
        label: seg,
        radius: 7,
        color: COLORS.segment,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        data: { targetDistance: dist }
      });
      links.push({
        source: `seg-${seg}`,
        target: 'hub',
        type: 'hub-segment'
      });
    });

    // 3. LUCs
    const maxValor = Math.max(...data.map(d => Number(d.cobertura) || 0));
    const minR = 4;
    const maxR = 12;
    
    data.forEach(d => {
      const segId = `seg-${d.segmento || 'Outros'}`;
      const statusKey = getStatusKey(d.status);
      const valor = Number(d.cobertura) || 0;
      const proportionalRadius = maxValor > 0 ? minR + ((valor / maxValor) * (maxR - minR)) : 6;

      nodes.push({
        id: d.luc,
        type: 'luc',
        label: d.luc,
        radius: 6,
        color: COLORS[statusKey] || COLORS.sem_status,
        data: { ...d, proportionalRadius }
      });
      links.push({
        source: d.luc,
        target: segId,
        type: 'segment-luc'
      });
    });

    const textColor = globalTheme === 'dark' ? '#9ca3af' : '#4b5563';
    const lineColor = globalTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links)
        .id(d => d.id)
        .distance(d => {
          if (d.type === 'hub-segment') return (d.source as Node).data?.targetDistance || 350;
          return 50;
        })
        .strength(d => {
          if (d.type === 'hub-segment') return 1;
          return 0.5;
        })
      )
      .force('charge', d3.forceManyBody().strength(-30).distanceMax(80))
      .force('collide', d3.forceCollide<Node>().radius(d => {
        if (d.type === 'segment') return 30;
        return d.radius + 2;
      }).iterations(3))
      .force('cluster-spacing', (alpha: number) => {
        const segs = nodes.filter(n => n.type === 'segment');
        for (let i = 0; i < segs.length; i++) {
          for (let j = i + 1; j < segs.length; j++) {
            const a = segs[i];
            const b = segs[j];
            const dx = a.x! - b.x!;
            const dy = a.y! - b.y!;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minSpacing = 130;
            if (dist > 0 && dist < minSpacing) {
              const f = (minSpacing - dist) * 0.5 * alpha;
              const fX = (dx / dist) * f;
              const fY = (dy / dist) * f;
              a.vx! += fX;
              a.vy! += fY;
              b.vx! -= fX;
              b.vy! -= fY;
            }
          }
        }
      });

    for (let i = 0; i < 250; ++i) simulation.tick();

    let maxNodeDelay = 0;
    nodes.forEach((d, i) => {
      d.data = d.data || {};
      d.data.targetX = d.x || width / 2;
      d.data.targetY = d.y || height / 2;
      d.x = width / 2;
      d.y = height / 2;
      
      if (d.type === 'hub') d.data.delay = 0;
      else if (d.type === 'segment') d.data.delay = 50;
      else d.data.delay = (100 + (i * 3)) || 0;
      
      maxNodeDelay = Math.max(maxNodeDelay, d.data.delay || 0);
    });

    let maxLinkDelay = 0;
    links.forEach((l) => {
      const t = l.target as Node;
      const targetY = t.data?.targetY ?? height / 2;
      const targetX = t.data?.targetX ?? width / 2;
      const angle = Math.atan2(targetY - (height / 2), targetX - (width / 2)) || 0;
      let normalizedAngle = angle + Math.PI / 2;
      if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
      const angleProgress = normalizedAngle / (Math.PI * 2);
      l.data = l.data || {};
      l.data.delay = (300 + (angleProgress * 200)) || 0; 
      maxLinkDelay = Math.max(maxLinkDelay, l.data.delay || 0);
    });

    const explosionDuration = Math.max(maxNodeDelay + 400, maxLinkDelay + 250) || 2000;

    simulation.stop();
    simulationRef.current = simulation;

    const linkElements = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', lineColor)
      .attr('stroke-width', 1)
      .attr('x1', width / 2)
      .attr('y1', height / 2)
      .attr('x2', width / 2)
      .attr('y2', height / 2);

    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .attr('transform', `translate(${width / 2}, ${height / 2})`)
      .on('mouseenter', (event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null));

    const defs = d3.select(svgRef.current).select('defs');
    if (defs.empty()) {
      const newDefs = d3.select(svgRef.current).append('defs');
      const filter = newDefs.append('filter').attr('id', 'glow');
      filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    const neutralGray = globalTheme === 'dark' ? '#374151' : '#d1d5db';

    nodeGroup.append('circle')
      .attr('class', 'visual-circle')
      .attr('r', 0)
      .attr('fill', neutralGray)
      .attr('stroke', globalTheme === 'dark' ? '#000' : '#fff')
      .attr('stroke-width', 1)
      .style('opacity', 0)
      .attr('filter', d => d.type === 'hub' ? 'url(#glow)' : null);

    nodeGroup.append('circle')
      .attr('class', 'hit-area')
      .attr('r', d => d.radius + 10)
      .attr('fill', 'transparent');

    nodeGroup.filter(d => d.type === 'hub' || d.type === 'segment')
      .append('text')
      .attr('y', d => d.radius + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', textColor)
      .attr('font-size', d => d.type === 'hub' ? '14px' : '12px')
      .attr('font-weight', d => d.type === 'hub' ? 'bold' : 'normal')
      .style('opacity', 0)
      .text(d => d.label.length > 20 ? d.label.substring(0, 20).trim() + '...' : d.label);

    nodeGroup.append('title')
      .text(d => d.label);

    const drag = d3.drag<SVGGElement, Node>()
      .on('start', (event, d) => {
        if (!event.active && animPhaseRef.current === 'idle') simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active && animPhaseRef.current === 'idle') simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag);

    simulation.on('tick', () => {
      if (animPhaseRef.current === 'exploding' || animPhaseRef.current === 'drawing') return;
      
      linkElements
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      nodeGroup.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    const easeOutElastic = (t: number) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    };
    
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

    const tickAnimation = (timestamp: number) => {
      const getRadius = (d: any) => {
         if (d.type !== 'luc') return d.radius || 0;
         return proportionalSizeRef.current ? (d.data?.proportionalRadius || d.radius) : d.radius;
      };

      try {
        if (!animStartRef.current) animStartRef.current = timestamp;
        const elapsed = timestamp - animStartRef.current;
        const phase = animPhaseRef.current;

        if (phase === 'exploding' || phase === 'drawing') {
          if (elapsed > explosionDuration) {
            animPhaseRef.current = 'settling';
            simulation.alpha(0.3).velocityDecay(0.4).restart();
            nodeGroup.select('.visual-circle')
              .attr('r', (d: any) => getRadius(d))
              .style('opacity', 1)
              .attr('fill', (d: any) => d.color);
              
            linkElements
              .attr('x1', (d: any) => (d.source as Node).x!)
              .attr('y1', (d: any) => (d.source as Node).y!)
              .attr('x2', (d: any) => (d.target as Node).x!)
              .attr('y2', (d: any) => (d.target as Node).y!);
              
            nodeGroup.select('text').style('opacity', 1);
          } else {
            nodeGroup.attr('transform', (d: Node) => {
               const delay = d.data?.delay || 0;
               let t = (elapsed - delay) / 400;
               if (t < 0) t = 0; if (t > 1) t = 1;
               const e = easeOutElastic(t);
               d.x = (width / 2) + ((d.data?.targetX ?? width/2) - (width / 2)) * e;
               d.y = (height / 2) + ((d.data?.targetY ?? height/2) - (height / 2)) * e;
               return `translate(${d.x || 0}, ${d.y || 0})`;
            });

            nodeGroup.select('.visual-circle')
              .attr('r', function(this: any, d: any) {
                 const delay = d.data?.delay || 0;
                 let t = (elapsed - delay) / 400;
                 if (t < 0) t = 0; if (t > 1) t = 1;
                 return getRadius(d) * easeOutElastic(t);
              })
              .style('opacity', function(this: any, d: any) {
                 const delay = d.data?.delay || 0;
                 let t = (elapsed - delay) / 200;
                 if (t < 0) t = 0; if (t > 1) t = 1;
                 return t;
              })
              .attr('fill', function(this: any, d: any) {
                 const delay = d.data?.delay || 0;
                 let t = (elapsed - delay - 200) / 200;
                 if (t > 0.5) return d.color || neutralGray;
                 return neutralGray;
              });

            if (elapsed > 300) {
              if (animPhaseRef.current !== 'drawing') animPhaseRef.current = 'drawing';
              linkElements
                .style('opacity', function(this: any, d: any) {
                   const delay = d.data?.delay || 0;
                   return elapsed > delay ? 1 : 0;
                })
                .attr('x1', function(this: any, d: any) { return (d.source as Node).x || 0; })
                .attr('y1', function(this: any, d: any) { return (d.source as Node).y || 0; })
                .attr('x2', function(this: any, d: any) {
                   const delay = d.data?.delay || 0;
                   let t = (elapsed - delay) / 250;
                   if (t < 0) t = 0; if (t > 1) t = 1;
                   const e = easeInOutCubic(t);
                   const sx = (d.source as Node).x || 0;
                   const tx = (d.target as Node).x || 0;
                   return sx + (tx - sx) * e;
                })
                .attr('y2', function(this: any, d: any) {
                   const delay = d.data?.delay || 0;
                   let t = (elapsed - delay) / 250;
                   if (t < 0) t = 0; if (t > 1) t = 1;
                   const e = easeInOutCubic(t);
                   const sy = (d.source as Node).y || 0;
                   const ty = (d.target as Node).y || 0;
                   return sy + (ty - sy) * e;
                });
            }
          }
        } else if (phase === 'settling') {
          if (elapsed > explosionDuration + 1300) {
            animPhaseRef.current = 'idle';
            setIsAnimating(false);
            simulation.stop();
          }
        } else if (phase === 'idle') {
          const pulseTime = elapsed % 4000;
          let scale = 1;
          if (pulseTime < 600) {
             const t = pulseTime / 600;
             const pulseE = easeInOutSine(t < 0.5 ? t * 2 : (1 - t) * 2);
             scale = 1 + (0.3 * pulseE);
          }
          nodeGroup.filter((d: any) => d.type === 'hub')
            .select('.visual-circle')
            .attr('r', (d: any) => (d.radius || 0) * scale);
        }

        rafRef.current = requestAnimationFrame(tickAnimation);
      } catch (err) {
        console.error("Erro na animação do grafo:", err);
        animPhaseRef.current = 'idle';
        simulation.stop();
        nodeGroup.attr('transform', (d: any) => `translate(${d.data?.targetX || width/2}, ${d.data?.targetY || height/2})`);
        nodeGroup.select('.visual-circle').attr('r', (d: any) => getRadius(d)).style('opacity', 1).attr('fill', (d: any) => d.color);
        linkElements.attr('x1', (d: any) => (d.source as Node).x!).attr('y1', (d: any) => (d.source as Node).y!).attr('x2', (d: any) => (d.target as Node).x!).attr('y2', (d: any) => (d.target as Node).y!).style('opacity', 1);
        nodeGroup.select('text').style('opacity', 1);
        setIsAnimating(false);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tickAnimation);

    return () => {
      simulation.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [data, globalTheme]);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const g = d3.select(wrapperRef.current);
    const nodeGroup = g.selectAll<SVGGElement, Node>('.graph-node');
    const linkElements = g.selectAll<SVGLineElement, Link>('line');

    const filtersChanged = prevFilterRef.current.timeline !== timelineFilter || prevFilterRef.current.crisis !== crisisMode;
    if (filtersChanged && simulationRef.current && animPhaseRef.current === 'idle') {
      animPhaseRef.current = 'settling';
      if (animStartRef.current) animStartRef.current = performance.now() - 700;
      setIsAnimating(true);
      simulationRef.current.alpha(0.3).velocityDecay(0.4).restart();
    }
    prevFilterRef.current = { timeline: timelineFilter, crisis: crisisMode };

    if (isAnimating) return;

    const neighbors = new Set<string>();
    if (hoveredNode) {
      neighbors.add(hoveredNode.id);
      linkElements.each(function(l) {
        const sId = typeof l.source === 'object' ? (l.source as Node).id : l.source as string;
        const tId = typeof l.target === 'object' ? (l.target as Node).id : l.target as string;
        if (sId === hoveredNode.id) neighbors.add(tId);
        if (tId === hoveredNode.id) neighbors.add(sId);
      });
    }

    nodeGroup.style('opacity', (d: Node) => {
      let op = 1;
      
      if (crisisMode) {
        if (d.type === 'hub') op = 0.2;
        else if (d.type === 'segment') op = 0.1;
        else {
          const st = getStatusKey(d.data?.status);
          op = (st === 'conforme' || st === 'sem_status') ? 0.05 : 1;
        }
      } else if (timelineFilter !== null && timelineFilter >= 0) {
        if (d.type === 'segment') op = 0.5;
        else if (d.type === 'luc') {
          const dias = d.data?.dias_restantes ?? -1;
          const minDays = timelineFilter * 30;
          const maxDays = (timelineFilter + 1) * 30;
          op = (dias >= minDays && dias <= maxDays) ? 1 : 0.2;
        }
      }

      if (hoveredNode) {
        return neighbors.has(d.id) ? 1 : Math.min(op, 0.15);
      }

      return op;
    });

    linkElements.style('opacity', (l: Link) => {
      let op = 1;
      if (crisisMode) op = 0.2;
      else if (timelineFilter !== null && timelineFilter >= 0) op = 0.1;

      if (hoveredNode) {
        const sId = typeof l.source === 'object' ? (l.source as Node).id : l.source as string;
        const tId = typeof l.target === 'object' ? (l.target as Node).id : l.target as string;
        return (sId === hoveredNode.id || tId === hoveredNode.id) ? 1 : Math.min(op, 0.05);
      }
      return op;
    });

    nodeGroup.selectAll('.visual-circle').style('animation', (d: any) => {
      if (crisisMode) {
        const st = getStatusKey(d.data?.status);
        if (st === 'vencida' || st === 'a_vencer') return 'pulse-crisis 1.2s infinite ease-in-out';
      } else if (timelineFilter !== null && timelineFilter >= 0) {
        if (d.type === 'luc') {
          const dias = d.data?.dias_restantes ?? -1;
          const minDays = timelineFilter * 30;
          const maxDays = (timelineFilter + 1) * 30;
          if (dias >= minDays && dias <= maxDays) return 'pulse-scale 1.5s infinite ease-in-out';
        }
      }
      return 'none';
    });

  }, [hoveredNode, timelineFilter, crisisMode, isAnimating]);

  // Effect specifically for proportional size transition
  useEffect(() => {
    if (!wrapperRef.current || isAnimating) return;
    const g = d3.select(wrapperRef.current);
    const nodeGroup = g.selectAll<SVGGElement, Node>('.graph-node');

    nodeGroup.select('.visual-circle')
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr('r', (d: any) => {
        if (d.type !== 'luc') return d.radius;
        return proportionalSize ? (d.data?.proportionalRadius || d.radius) : d.radius;
      });
      
    nodeGroup.select('.hit-area')
      .attr('r', (d: any) => {
        if (d.type !== 'luc') return d.radius + 10;
        const r = proportionalSize ? (d.data?.proportionalRadius || d.radius) : d.radius;
        return r + 10;
      });
  }, [proportionalSize, isAnimating]);

  return (
    <div className={`h-screen w-full transition-colors duration-300 ${globalTheme === 'dark' ? 'bg-[#0F1117]' : 'bg-[#f8fafc]'}`}>
      <style>{`
        @keyframes pulse-scale {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(2); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-crisis {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(2.5); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div className="absolute top-6 right-6 z-50 flex flex-col items-center gap-3">
        <button 
          onClick={() => navigate('/seguros')}
          className={`p-3 rounded-full backdrop-blur-md border transition-colors shadow-lg ${
            globalTheme === 'dark'
              ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              : 'bg-black/5 border-black/10 text-gray-500 hover:text-black hover:bg-black/10'
          }`}
          title="Fechar Grafo (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={() => setProportionalSize(!proportionalSize)}
          className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-lg ${
            proportionalSize
              ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
              : globalTheme === 'dark'
                ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                : 'bg-black/5 border-black/10 text-gray-500 hover:bg-black/10 hover:text-black'
          }`}
          title="Tamanho ∝ Valor"
        >
          <CircleDot className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCrisisMode(!crisisMode)}
          className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-lg ${
            crisisMode
              ? 'bg-[#ef4444] text-white border-[#ef4444] animate-pulse'
              : globalTheme === 'dark'
                ? 'bg-white/5 border-white/10 text-[#ef4444] hover:bg-white/10 hover:text-[#fca5a5]'
                : 'bg-black/5 border-black/10 text-[#ef4444] hover:bg-black/10 hover:text-[#b91c1c]'
          }`}
          title={crisisMode ? 'Desativar Modo Crise' : 'Ativar Modo Crise'}
        >
          <Siren className="w-5 h-5" />
        </button>
      </div>

      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
        <defs></defs>
        <g ref={wrapperRef}></g>
      </svg>

      {/* Slider Filter de Onda de Vencimento */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 p-4 rounded-xl border w-[400px] transition-colors backdrop-blur-md ${
        globalTheme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-black/10'
      }`}>
        <div className={`flex justify-between w-full text-[11px] font-medium uppercase tracking-wider ${
          globalTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <span>Hoje</span>
          <span className={`font-bold ${globalTheme === 'dark' ? 'text-white' : 'text-black'}`}>
            {timelineFilter === null || timelineFilter === -1 ? 'Filtro Desligado' : `Em ${timelineFilter} meses`}
          </span>
          <span>+12 Meses</span>
        </div>
        <input 
          type="range" 
          min="-1" 
          max="12" 
          step="1"
          value={timelineFilter === null ? -1 : timelineFilter}
          onChange={e => {
            const val = parseInt(e.target.value);
            setTimelineFilter(val === -1 ? null : val);
          }}
          className={`w-full accent-[#4ade80] h-1 rounded-lg appearance-none cursor-pointer ${
            globalTheme === 'dark' ? 'bg-white/20' : 'bg-black/20'
          }`}
        />
      </div>

      <AnimatePresence>
        {hoveredNode && hoveredNode.type === 'luc' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute bottom-6 left-6 z-50 p-4 rounded-xl shadow-2xl border min-w-[260px] backdrop-blur-md pointer-events-none ${
              globalTheme === 'dark'
                ? 'bg-gray-900/95 border-gray-700/50 text-white'
                : 'bg-white/95 border-gray-200 text-gray-900'
            }`}
          >
            <h3 className="font-bold text-[16px] leading-tight">{hoveredNode.data.lojista || hoveredNode.data.fantasia || "Não informada"}</h3>
            <p className="text-[12px] opacity-70 font-mono mt-0.5">LUC: {hoveredNode.data.luc}</p>
            <div className="mt-2 pt-2 border-t border-gray-500/30 flex justify-between items-center text-[13px]">
              <span className="opacity-70">Status</span>
              <span className="font-medium uppercase" style={{ color: COLORS[getStatusKey(hoveredNode.data.status)] }}>
                {hoveredNode.data.status || 'Sem status'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px] mt-1">
              <span className="opacity-70">Segmento</span>
              <span className="font-medium">{hoveredNode.data.segmento || '—'}</span>
            </div>
            <div className="flex justify-between items-center text-[13px] mt-1">
              <span className="opacity-70">Cobertura</span>
              <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(hoveredNode.data.cobertura) || 0)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
