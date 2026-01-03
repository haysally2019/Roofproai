import { EdgeTypeConfig } from '../types';

export const EDGE_TYPE_CONFIGS: Record<string, EdgeTypeConfig> = {
  Ridge: {
    type: 'Ridge',
    color: '#ef4444',
    strokeColor: '#dc2626',
    hoverColor: '#fee2e2',
    label: 'Ridge',
    abbreviation: 'R',
    description: 'Horizontal peak line where two roof planes meet at the top',
    icon: '⛰️'
  },
  Hip: {
    type: 'Hip',
    color: '#f97316',
    strokeColor: '#ea580c',
    hoverColor: '#ffedd5',
    label: 'Hip',
    abbreviation: 'H',
    description: 'Angled line where two sloping roof planes meet externally',
    icon: '📐'
  },
  Valley: {
    type: 'Valley',
    color: '#3b82f6',
    strokeColor: '#2563eb',
    hoverColor: '#dbeafe',
    label: 'Valley',
    abbreviation: 'V',
    description: 'Angled line where two sloping roof planes meet internally',
    icon: '🏔️'
  },
  Eave: {
    type: 'Eave',
    color: '#10b981',
    strokeColor: '#059669',
    hoverColor: '#d1fae5',
    label: 'Eave',
    abbreviation: 'E',
    description: 'Bottom edge where roof overhangs the wall',
    icon: '🏠'
  },
  Rake: {
    type: 'Rake',
    color: '#8b5cf6',
    strokeColor: '#7c3aed',
    hoverColor: '#ede9fe',
    label: 'Rake',
    abbreviation: 'Rk',
    description: 'Sloped edge at the gable end',
    icon: '📏'
  },
  Penetration: {
    type: 'Penetration',
    color: '#ec4899',
    strokeColor: '#db2777',
    hoverColor: '#fce7f3',
    label: 'Penetration',
    abbreviation: 'P',
    description: 'Openings for chimneys, vents, skylights',
    icon: '🔺'
  },
  Unlabeled: {
    type: 'Unlabeled',
    color: '#94a3b8',
    strokeColor: '#64748b',
    hoverColor: '#f1f5f9',
    label: 'Unlabeled',
    abbreviation: 'U',
    description: 'Edge not yet classified',
    icon: '❓'
  }
};

export const getEdgeTypeConfig = (type: string): EdgeTypeConfig => {
  return EDGE_TYPE_CONFIGS[type] || EDGE_TYPE_CONFIGS.Unlabeled;
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,
  MEDIUM: 60,
  LOW: 0
};

export const getConfidenceLevel = (score: number): 'high' | 'medium' | 'low' => {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
};
