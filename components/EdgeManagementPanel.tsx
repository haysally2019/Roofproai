import React, { useState } from 'react';
import { RoofEdge, EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS, getConfidenceLevel } from '../lib/edgeTypeConstants';
import { ChevronDown, ChevronRight, CheckCircle, AlertCircle, HelpCircle, MapPin } from 'lucide-react';

interface EdgeManagementPanelProps {
  edges: RoofEdge[];
  onEdgeClick: (edgeId: string) => void;
  onEdgeTypeChange: (edgeId: string, newType: EdgeType) => void;
  highlightedEdgeId?: string;
}

const EdgeManagementPanel: React.FC<EdgeManagementPanelProps> = ({
  edges,
  onEdgeClick,
  onEdgeTypeChange,
  highlightedEdgeId
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    autoDetected: true,
    userLabeled: true,
    unlabeled: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const autoDetectedEdges = edges.filter(e => e.autoDetected && !e.userModified && e.edgeType !== 'Unlabeled');
  const userLabeledEdges = edges.filter(e => e.userModified || (!e.autoDetected && e.edgeType !== 'Unlabeled'));
  const unlabeledEdges = edges.filter(e => e.edgeType === 'Unlabeled');

  const groupByType = (edgeList: RoofEdge[]) => {
    const grouped: Record<string, RoofEdge[]> = {};
    edgeList.forEach(edge => {
      if (!grouped[edge.edgeType]) {
        grouped[edge.edgeType] = [];
      }
      grouped[edge.edgeType].push(edge);
    });
    return grouped;
  };

  const renderEdgeItem = (edge: RoofEdge) => {
    const config = EDGE_TYPE_CONFIGS[edge.edgeType];
    const confidenceLevel = getConfidenceLevel(edge.confidenceScore);
    const isHighlighted = highlightedEdgeId === edge.id;

    return (
      <div
        key={edge.id}
        className={`p-2 rounded-lg border-2 transition-all cursor-pointer ${
          isHighlighted
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
        onClick={() => onEdgeClick(edge.id)}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-semibold text-slate-900">
            {config.label}
          </span>
          <span className="text-xs text-slate-500">
            {Math.round(edge.lengthFt)}ft
          </span>
          {edge.autoDetected && !edge.userModified && (
            <span className="ml-auto flex items-center gap-1 text-xs">
              {confidenceLevel === 'high' && (
                <>
                  <CheckCircle size={14} className="text-green-600" />
                  <span className="text-green-600 font-medium">{Math.round(edge.confidenceScore)}%</span>
                </>
              )}
              {confidenceLevel === 'medium' && (
                <>
                  <AlertCircle size={14} className="text-amber-600" />
                  <span className="text-amber-600 font-medium">{Math.round(edge.confidenceScore)}%</span>
                </>
              )}
              {confidenceLevel === 'low' && (
                <>
                  <HelpCircle size={14} className="text-slate-500" />
                  <span className="text-slate-500 font-medium">{Math.round(edge.confidenceScore)}%</span>
                </>
              )}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdgeClick(edge.id);
            }}
            className="ml-auto text-blue-600 hover:text-blue-700"
            title="Locate on map"
          >
            <MapPin size={14} />
          </button>
        </div>
        {edge.detectionReason && !edge.userModified && (
          <p className="text-xs text-slate-600 mt-1">{edge.detectionReason}</p>
        )}
        <div className="mt-1">
          <select
            value={edge.edgeType}
            onChange={(e) => {
              e.stopPropagation();
              onEdgeTypeChange(edge.id, e.target.value as EdgeType);
            }}
            className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            {Object.keys(EDGE_TYPE_CONFIGS).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    edgeList: RoofEdge[],
    icon: React.ReactNode
  ) => {
    const isExpanded = expandedSections[sectionKey];
    const groupedEdges = groupByType(edgeList);

    return (
      <div className="mb-3">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          {icon}
          <span className="font-semibold text-slate-900">{title}</span>
          <span className="ml-auto text-sm text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
            {edgeList.length}
          </span>
        </button>
        {isExpanded && edgeList.length > 0 && (
          <div className="mt-2 space-y-1 pl-2">
            {Object.entries(groupedEdges).map(([type, typeEdges]) => (
              <div key={type} className="space-y-1">
                <div className="text-xs font-medium text-slate-700 px-2 py-1">
                  {EDGE_TYPE_CONFIGS[type].label} ({typeEdges.length})
                </div>
                {typeEdges.map(renderEdgeItem)}
              </div>
            ))}
          </div>
        )}
        {isExpanded && edgeList.length === 0 && (
          <div className="mt-2 px-3 py-2 text-sm text-slate-500 italic">
            No edges in this category
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-lg h-full overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Edge Management</h3>
        <p className="text-sm text-slate-600">
          {edges.length} total edges: {userLabeledEdges.length} labeled, {autoDetectedEdges.length} auto-detected, {unlabeledEdges.length} unlabeled
        </p>
      </div>

      {renderSection(
        'Auto-Detected Suggestions',
        'autoDetected',
        autoDetectedEdges,
        <AlertCircle size={18} className="text-amber-600" />
      )}

      {renderSection(
        'User-Labeled',
        'userLabeled',
        userLabeledEdges,
        <CheckCircle size={18} className="text-green-600" />
      )}

      {renderSection(
        'Unlabeled',
        'unlabeled',
        unlabeledEdges,
        <HelpCircle size={18} className="text-slate-500" />
      )}
    </div>
  );
};

export default EdgeManagementPanel;
