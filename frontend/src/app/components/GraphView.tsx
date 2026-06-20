import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { listApolices, ApoliceRecord } from '../../api/apolice';
import { TIME_OFFSETS, WEEKS_PAST, getStatusAtDate } from "../utils/timeline";
import { Share2, Plus, Users, Filter, X, Building2, Map as MapIcon, Siren, CircleDot, Play, Pause, MousePointer2, BoxSelect, Shield, Moon, Sun } from 'lucide-react';
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

const SEGURADORA_COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#eab308', // yellow-500
  '#6366f1', // indigo-500
  '#f43f5e', // rose-500
  '#84cc16', // lime-500
  '#06b6d4', // cyan-500
];

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
  const [timeOffsetIdx, setTimeOffsetIdx] = useState(WEEKS_PAST);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crisisMode, setCrisisMode] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'drag' | 'select'>('drag');
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [colorMode, setColorMode] = useState<'status' | 'seguradora'>('status');
  const [isAnimating, setIsAnimating] = useState(true);
  const [globalTheme, setGlobalTheme] = useState<'dark' | 'light'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const seguradorasMap = React.useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.seguradora || 'Outras').filter(Boolean)));
    unique.sort();
    const map: Record<string, string> = {};
    unique.forEach((seg, i) => {
      map[seg] = SEGURADORA_COLORS[i % SEGURADORA_COLORS.length];
    });
    return map;
  }, [data]);

  const rafRef = useRef<number | null>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const animPhaseRef = useRef<'exploding' | 'drawing' | 'settling' | 'idle'>('exploding');
  const animStartRef = useRef<number | null>(null);
  const prevFilterRef = useRef<{ crisis: boolean }>({ crisis: false });
  const nodesRef = useRef<Node[]>([]);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setTimeOffsetIdx((prev) => {
          if (prev >= TIME_OFFSETS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

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

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        g.selectAll('text').style('opacity', event.transform.k < 0.8 ? 0 : 1);
      });
    zoomRef.current = zoom;
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
    data.forEach(d => {
      const segId = `seg-${d.segmento || 'Outros'}`;
      const statusKey = getStatusKey(d.status);

      nodes.push({
        id: d.luc,
        type: 'luc',
        label: d.luc,
        radius: 6,
        color: COLORS[statusKey] || COLORS.sem_status,
        data: { ...d }
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
    nodesRef.current = nodes;

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
         return d.radius || 0;
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
  }, [data]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const g = d3.select(wrapperRef.current);
    const lineColor = globalTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
    const nodeStroke = globalTheme === 'dark' ? '#000' : '#fff';
    
    g.selectAll('line').transition().duration(300).attr('stroke', lineColor);
    g.selectAll('.visual-circle').transition().duration(300).attr('stroke', nodeStroke);
  }, [globalTheme]);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const g = d3.select(wrapperRef.current);
    const nodeGroup = g.selectAll<SVGGElement, Node>('.graph-node');
    const linkElements = g.selectAll<SVGLineElement, Link>('line');

    const filtersChanged = prevFilterRef.current.crisis !== crisisMode;
    if (filtersChanged && simulationRef.current && animPhaseRef.current === 'idle') {
      animPhaseRef.current = 'settling';
      if (animStartRef.current) animStartRef.current = performance.now() - 700;
      setIsAnimating(true);
      simulationRef.current.alpha(0.3).velocityDecay(0.4).restart();
    }
    prevFilterRef.current = { crisis: crisisMode };

    if (isAnimating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNodes.length > 0) {
        setInteractionMode('drag');
        setSelectedNodes([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes.length]);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    
    if (interactionMode === 'select') {
      svg.on('.zoom', null);
      
      const brush = d3.brush()
        .extent([[0, 0], [window.innerWidth, window.innerHeight]])
        .on('end', (event) => {
          if (!event.selection) {
            setSelectedNodes([]);
            return;
          }
          const [[x0, y0], [x1, y1]] = event.selection;
          const transform = d3.zoomTransform(svgRef.current!);
          
          const selected = nodesRef.current.filter((d: Node) => {
            if (d.type !== 'luc') return false;
            const nx = transform.applyX(d.x || 0);
            const ny = transform.applyY(d.y || 0);
            return nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1;
          });
          
          setSelectedNodes(selected);
        });
        
      const brushGroup = svg.append('g').attr('class', 'brush-group').call(brush);
      return () => {
        brushGroup.remove();
      };
    } else {
      setSelectedNodes([]);
      svg.call(zoomRef.current);
    }
  }, [interactionMode]);

  useEffect(() => {
    if (!wrapperRef.current || isAnimating) return;
    const g = d3.select(wrapperRef.current);
    const nodeGroup = g.selectAll<SVGGElement, Node>('.graph-node');
    const linkElements = g.selectAll<SVGLineElement, Link>('line');

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

      if (selectedNodes.length > 0) {
        if (!selectedNodes.find(sn => sn.id === d.id)) {
          op = 0.1;
        }
      }
      
      if (crisisMode) {
        if (d.type === 'hub') op = 0.2;
        else if (d.type === 'segment') op = 0.1;
        else {
          const daysBack = TIME_OFFSETS[timeOffsetIdx].days;
          const historicalStatus = daysBack === 0 ? d.data.status : getStatusAtDate(d.data.vencimento, daysBack);
          const st = getStatusKey(historicalStatus);
          op = (st === 'conforme' || st === 'sem_status') ? 0.05 : 1;
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

      if (hoveredNode) {
        const sId = typeof l.source === 'object' ? (l.source as Node).id : l.source as string;
        const tId = typeof l.target === 'object' ? (l.target as Node).id : l.target as string;
        return (sId === hoveredNode.id || tId === hoveredNode.id) ? 1 : Math.min(op, 0.05);
      }
      return op;
    });

    nodeGroup.selectAll('.visual-circle').style('animation', (d: any) => {
      if (crisisMode) {
        const daysBack = TIME_OFFSETS[timeOffsetIdx].days;
        const historicalStatus = daysBack === 0 ? d.data.status : getStatusAtDate(d.data.vencimento, daysBack);
        const st = getStatusKey(historicalStatus);
        if (st === 'vencida' || st === 'a_vencer') return 'pulse-crisis 1.2s infinite ease-in-out';
      }
      return 'none';
    });

  }, [hoveredNode, crisisMode, isAnimating, selectedNodes, timeOffsetIdx, globalTheme]);

  useEffect(() => {
    if (!wrapperRef.current || animPhaseRef.current === 'drawing' || animPhaseRef.current === 'exploding') return;
    const svg = d3.select(wrapperRef.current);
    
    svg.selectAll('.visual-circle')
       .filter((d: any) => d.type === 'luc')
       .transition()
       .duration(150)
       .attr('fill', (d: any) => {
         if (colorMode === 'seguradora') {
           const seg = d.data.seguradora || 'Outras';
           return seguradorasMap[seg] || '#9ca3af';
         } else {
           const daysBack = TIME_OFFSETS[timeOffsetIdx].days;
           const historicalStatus = daysBack === 0 ? d.data.status : getStatusAtDate(d.data.vencimento, daysBack);
           const statusKey = getStatusKey(historicalStatus);
           return COLORS[statusKey] || COLORS.sem_status;
         }
       });

    svg.selectAll('.visual-circle')
       .filter((d: any) => d.type === 'segment')
       .transition()
       .duration(150)
       .attr('fill', (d: any) => {
         if (colorMode === 'seguradora') {
           const segmentName = d.label;
           const segmentData = data.filter(r => (r.segmento || 'Outros') === segmentName);
           const counts: Record<string, number> = {};
           let maxSeg = 'Outras';
           let maxCount = 0;
           segmentData.forEach(r => {
             const seg = r.seguradora || 'Outras';
             counts[seg] = (counts[seg] || 0) + 1;
             if (counts[seg] > maxCount) {
               maxCount = counts[seg];
               maxSeg = seg;
             }
           });
           return seguradorasMap[maxSeg] || COLORS.segment;
         } else {
           return COLORS.segment;
         }
       });
  }, [timeOffsetIdx, colorMode, seguradorasMap, data]);



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
      <div className="absolute top-20 md:top-24 left-4 md:left-8 z-50 flex flex-col gap-2 md:gap-3 pointer-events-auto">
        <div className={`flex flex-col gap-1 p-1 rounded-[16px] md:rounded-[20px] backdrop-blur-md border shadow-lg ${globalTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
          <button
            onClick={() => setInteractionMode('drag')}
            className={`p-2 md:p-3 rounded-full flex items-center justify-center transition-all ${
              interactionMode === 'drag'
                ? 'bg-[#3b82f6] text-white shadow-md'
                : globalTheme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/10'
            }`}
            title="Modo Pan/Arrastar"
          >
            <MousePointer2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setInteractionMode('select')}
            className={`p-2 md:p-3 rounded-full flex items-center justify-center transition-all ${
              interactionMode === 'select'
                ? 'bg-[#3b82f6] text-white shadow-md'
                : globalTheme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/10'
            }`}
            title="Modo Seleção em Massa (Brush)"
          >
            <BoxSelect className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
        <div className={`flex flex-col gap-1 p-1 rounded-[16px] md:rounded-[20px] backdrop-blur-md border shadow-lg ${globalTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
          <button
            onClick={() => setColorMode(prev => prev === 'status' ? 'seguradora' : 'status')}
            className={`p-2 md:p-3 rounded-full flex items-center justify-center transition-all ${
              colorMode === 'seguradora'
                ? 'bg-[#8b5cf6] text-white shadow-md'
                : globalTheme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/10'
            }`}
            title={colorMode === 'seguradora' ? "Ver por Status de Risco" : "Ver por Fornecedor (Seguradora)"}
          >
            <Shield className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
        <button 
          onClick={() => navigate('/seguros')}
          className={`p-2 md:p-3 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors shadow-lg ${
            globalTheme === 'dark'
              ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              : 'bg-black/5 border-black/10 text-gray-500 hover:text-black hover:bg-black/10'
          }`}
          title="Fechar Grafo (Esc)"
        >
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        <button
          onClick={() => setCrisisMode(!crisisMode)}
          className={`p-2 md:p-3 rounded-full flex items-center justify-center backdrop-blur-md border transition-all shadow-lg ${
            crisisMode
              ? 'bg-[#ef4444] text-white border-[#ef4444] animate-pulse'
              : globalTheme === 'dark'
                ? 'bg-white/5 border-white/10 text-[#ef4444] hover:bg-white/10 hover:text-[#fca5a5]'
                : 'bg-black/5 border-black/10 text-[#ef4444] hover:bg-black/10 hover:text-[#b91c1c]'
          }`}
          title={crisisMode ? 'Desativar Modo Crise' : 'Ativar Modo Crise'}
        >
          <Siren className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          className={`p-2 md:p-3 rounded-full flex items-center justify-center backdrop-blur-md border transition-all shadow-lg ${
            globalTheme === 'dark'
              ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10 hover:text-yellow-300'
              : 'bg-black/5 border-black/10 text-indigo-600 hover:bg-black/10 hover:text-indigo-800'
          }`}
          title={globalTheme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {globalTheme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
      </div>

      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
        <defs></defs>
        <g ref={wrapperRef}></g>
      </svg>

      {/* Slider Filter de Onda de Vencimento / Timeline Animada */}
      <div className={`absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-4 p-2 sm:p-3 pr-3 sm:pr-5 rounded-xl border w-[95%] sm:w-[420px] max-w-[420px] transition-colors backdrop-blur-md ${
        globalTheme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white/80 border-black/10 shadow-lg'
      }`}>
        <button
          onClick={() => {
            if (!isPlaying && timeOffsetIdx >= TIME_OFFSETS.length - 1) {
              setTimeOffsetIdx(0);
              setIsPlaying(true);
            } else {
              setIsPlaying(!isPlaying);
            }
          }}
          className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full shadow-sm transition-colors ${
            globalTheme === 'dark' ? 'bg-[#2a2a2a] text-[#fca5a5] hover:bg-[#333]' : 'bg-white text-[#a0191e] hover:bg-gray-50 border border-gray-200'
          }`}
          title={isPlaying ? "Pausar" : "Reproduzir evolução"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
        
        <div className="flex flex-col flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${globalTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {timeOffsetIdx === WEEKS_PAST ? "Estado Atual" : timeOffsetIdx > WEEKS_PAST ? "Projeção Futura" : "Histórico"}
            </span>
            <span className={`text-[12px] font-bold ${globalTheme === 'dark' ? 'text-[#fca5a5]' : 'text-[#a0191e]'}`}>
              {TIME_OFFSETS[timeOffsetIdx].label}
            </span>
          </div>
          
          <input 
            type="range" 
            min="0" 
            max={TIME_OFFSETS.length - 1} 
            value={timeOffsetIdx} 
            onChange={(e) => {
              setIsPlaying(false);
              setTimeOffsetIdx(parseInt(e.target.value));
            }}
            className="w-full h-1.5 bg-gray-200 dark:bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#a0191e]"
            style={{ direction: 'ltr' }}
          />
        </div>
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

        {selectedNodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`absolute top-24 right-8 z-50 p-5 rounded-2xl border shadow-2xl backdrop-blur-xl w-[320px] pointer-events-auto ${
              globalTheme === 'dark' ? 'bg-[#1a1a1a]/95 border-white/10 text-white' : 'bg-white/95 border-black/10 text-gray-900'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg leading-none mb-1">Seleção de Lojas</h3>
                <p className={`text-xs ${globalTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedNodes.length} {selectedNodes.length === 1 ? 'loja' : 'lojas'}
                </p>
              </div>
              <button onClick={() => { setInteractionMode('drag'); setSelectedNodes([]); }} className={`p-1.5 rounded-full transition-colors ${globalTheme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${globalTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Valor de Cobertura Total</p>
                <p className="text-xl font-bold tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
                    selectedNodes.reduce((acc, n) => acc + (Number(n.data?.cobertura) || 0), 0)
                  )}
                </p>
              </div>
              
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${globalTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status no Período ({TIME_OFFSETS[timeOffsetIdx].label})</p>
                <div className="flex flex-col gap-2">
                  {['conforme', 'aVencer', 'vencida'].map(st => {
                    const count = selectedNodes.filter(n => {
                      const daysBack = TIME_OFFSETS[timeOffsetIdx].days;
                      const status = daysBack === 0 ? n.data.status : getStatusAtDate(n.data.vencimento, daysBack);
                      const key = getStatusKey(status);
                      return key === st || (st === 'aVencer' && key === 'a_vencer');
                    }).length;
                    if (count === 0) return null;
                    const pct = Math.round((count / selectedNodes.length) * 100);
                    const color = COLORS[st === 'aVencer' ? 'a_vencer' : st as keyof typeof COLORS];
                    return (
                      <div key={st} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="flex-1 capitalize">{st === 'aVencer' ? 'A Vencer' : st}</span>
                        <span className="font-bold">{pct}%</span>
                        <span className={`text-xs ${globalTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>({count})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {colorMode === 'seguradora' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`absolute bottom-28 left-8 z-50 p-4 rounded-xl border shadow-xl backdrop-blur-md max-h-[350px] overflow-y-auto pointer-events-auto ${
              globalTheme === 'dark' ? 'bg-[#1a1a1a]/95 border-white/10 text-white' : 'bg-white/95 border-black/10 text-gray-900'
            }`}
          >
            <h3 className="font-bold text-[13px] uppercase tracking-wider mb-3 opacity-80">Fornecedores</h3>
            <div className="flex flex-col gap-2.5">
              {Object.entries(seguradorasMap).map(([seg, color]) => (
                <div key={seg} className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                  <span className="text-[13px] font-medium truncate max-w-[150px]" title={seg}>{seg}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
