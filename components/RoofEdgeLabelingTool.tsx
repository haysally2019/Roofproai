import React, { useState, useEffect, useCallback } from 'react';
import { RoofEdge, EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS, getConfidenceLevel } from '../lib/edgeTypeConstants';
import {
  autoDetectAllEdges,
  calculateEdgeLength,
  calculateEdgeAngleToNorth,
  findConnectingEdges
} from '../lib/edgeDetection';
import EdgeTypeSelector from './EdgeTypeSelector';
import EdgeManagementPanel from './EdgeManagementPanel';
import EdgeTypesGuide from './EdgeTypesGuide';
import {
  Sparkles,
  CheckCircle,
  Undo2,
  Redo2,
  RotateCcw,
  HelpCircle,
  Save,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface RoofEdgeLabelingToolProps {
  measurementId: string;
  mapPolygons: any[];
  onSave: (edges: RoofEdge[]) => void;
  onCancel: () => void;
}

const RoofEdgeLabelingTool: React.FC<RoofEdgeLabelingToolProps> = ({
  measurementId,
  mapPolygons,
  onSave,
  onCancel
}) => {
  const [edges, setEdges] = useState<RoofEdge[]>([]);
  const [selectedType, setSelectedType] = useState<EdgeType | null>(null);
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | undefined>();
  const [history, setHistory] = useState<RoofEdge[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showGuide, setShowGuide] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    extractEdgesFromPolygons();
  }, [mapPolygons]);

  const extractEdgesFromPolygons = () => {
    const extractedEdges: RoofEdge[] = [];
    let displayOrder = 0;

    mapPolygons.forEach((polygon) => {
      const path = polygon.getPath();
      const points: { lat: number; lng: number }[] = [];

      for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i);
        points.push({ lat: point.lat(), lng: point.lng() });
      }

      for (let i = 0; i < points.length; i++) {
        const startPoint = points[i];
        const endPoint = points[(i + 1) % points.length];
        const edgePoints = [startPoint, endPoint];

        const edge: RoofEdge = {
          id: `edge-${displayOrder}`,
          measurementId,
          edgeType: 'Unlabeled',
          geometry: edgePoints,
          lengthFt: calculateEdgeLength(edgePoints),
          autoDetected: false,
          confidenceScore: 0,
          userModified: false,
          angleToNorth: calculateEdgeAngleToNorth(edgePoints),
          connectsTo: [],
          displayOrder,
          notes: ''
        };

        extractedEdges.push(edge);
        displayOrder++;
      }
    });

    extractedEdges.forEach(edge => {
      edge.connectsTo = findConnectingEdges(edge, extractedEdges);
    });

    setEdges(extractedEdges);
    addToHistory(extractedEdges);
  };

  const addToHistory = (newEdges: RoofEdge[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newEdges)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setEdges(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setEdges(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const handleAutoDetect = () => {
    const detectedEdges = autoDetectAllEdges(edges);
    setEdges(detectedEdges);
    addToHistory(detectedEdges);
  };

  const handleAcceptHighConfidence = () => {
    const updatedEdges = edges.map(edge => {
      if (edge.autoDetected && edge.confidenceScore >= 90 && !edge.userModified) {
        return { ...edge, userModified: true };
      }
      return edge;
    });
    setEdges(updatedEdges);
    addToHistory(updatedEdges);
  };

  const handleAcceptAllSuggestions = () => {
    const updatedEdges = edges.map(edge => {
      if (edge.autoDetected && !edge.userModified) {
        return { ...edge, userModified: true };
      }
      return edge;
    });
    setEdges(updatedEdges);
    addToHistory(updatedEdges);
  };

  const handleEdgeTypeChange = (edgeId: string, newType: EdgeType) => {
    const updatedEdges = edges.map(edge => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          edgeType: newType,
          userModified: true,
          autoDetected: false
        };
      }
      return edge;
    });
    setEdges(updatedEdges);
    addToHistory(updatedEdges);
  };

  const handleReset = () => {
    const resetEdges = edges.map(edge => ({
      ...edge,
      edgeType: 'Unlabeled' as EdgeType,
      autoDetected: false,
      confidenceScore: 0,
      userModified: false,
      detectionReason: undefined
    }));
    setEdges(resetEdges);
    addToHistory(resetEdges);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(edges);
    } finally {
      setSaving(false);
    }
  };

  const getEdgeCounts = useCallback(() => {
    const counts: Record<EdgeType, number> = {
      Ridge: 0,
      Hip: 0,
      Valley: 0,
      Eave: 0,
      Rake: 0,
      Penetration: 0,
      Unlabeled: 0
    };

    edges.forEach(edge => {
      counts[edge.edgeType]++;
    });

    return counts;
  }, [edges]);

  const edgeCounts = getEdgeCounts();
  const unlabeledCount = edgeCounts.Unlabeled;
  const totalLabeled = edges.length - unlabeledCount;
  const autoDetectedCount = edges.filter(e => e.autoDetected && !e.userModified).length;
  const highConfidenceCount = edges.filter(e => e.autoDetected && e.confidenceScore >= 90 && !e.userModified).length;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex">
      <div className={`bg-white h-full overflow-y-auto transition-all ${showPanel ? 'w-96' : 'w-0'}`}>
        {showPanel && (
          <div className="p-4 h-full flex flex-col">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-900">Edge Labeling</h2>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} className="text-slate-600" />
                </button>
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={18} className="text-blue-600" />
                  <span className="font-semibold text-blue-900">Progress</span>
                </div>
                <div className="text-sm text-blue-800">
                  <div className="flex justify-between mb-1">
                    <span>Labeled:</span>
                    <span className="font-bold">{totalLabeled} / {edges.length}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${edges.length > 0 ? (totalLabeled / edges.length) * 100 : 0}%` }}
                    />
                  </div>
                  {autoDetectedCount > 0 && (
                    <div className="text-xs">
                      {autoDetectedCount} auto-detected ({highConfidenceCount} high confidence)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <EdgeTypeSelector
                selectedType={selectedType}
                onSelectType={setSelectedType}
                edgeCounts={edgeCounts}
                unlabeledCount={unlabeledCount}
              />

              <div className="bg-white border-2 border-slate-200 rounded-xl p-3">
                <h4 className="font-semibold text-slate-900 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={handleAutoDetect}
                    className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} />
                    Auto-Detect All
                  </button>

                  {highConfidenceCount > 0 && (
                    <button
                      onClick={handleAcceptHighConfidence}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Accept High Confidence ({highConfidenceCount})
                    </button>
                  )}

                  {autoDetectedCount > 0 && (
                    <button
                      onClick={handleAcceptAllSuggestions}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Accept All Suggestions
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      className="flex-1 px-3 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Undo2 size={16} />
                      Undo
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                      className="flex-1 px-3 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Redo2 size={16} />
                      Redo
                    </button>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full px-3 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={18} />
                    Reset All Labels
                  </button>

                  <button
                    onClick={() => setShowGuide(true)}
                    className="w-full px-3 py-2 border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <HelpCircle size={18} />
                    Edge Types Guide
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <EdgeManagementPanel
                edges={edges}
                onEdgeClick={setHighlightedEdgeId}
                onEdgeTypeChange={handleEdgeTypeChange}
                highlightedEdgeId={highlightedEdgeId}
              />
            </div>

            <div className="mt-4 pt-4 border-t-2 border-slate-200 space-y-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {saving ? 'Saving...' : 'Save Edge Labels'}
              </button>
              <button
                onClick={onCancel}
                className="w-full px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white border-2 border-slate-300 rounded-r-lg p-2 shadow-lg hover:bg-slate-50 transition-colors"
        >
          <ChevronRight size={20} className="text-slate-600" />
        </button>
      )}

      <div className="flex-1 relative">
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-slate-200 rounded-lg shadow-xl px-6 py-3 z-10">
          <p className="text-sm text-slate-700 font-medium">
            {selectedType ? (
              <>
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: EDGE_TYPE_CONFIGS[selectedType].color }}
                />
                Click edges on the map to mark as <strong>{selectedType}</strong>
              </>
            ) : (
              'Select an edge type from the panel, then click edges to label them'
            )}
          </p>
        </div>
      </div>

      <EdgeTypesGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
};

export default RoofEdgeLabelingTool;
