import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Undo2, Trash2, Tag, Layers, Grid3x3, Ruler, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoofEdge, EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import CreditPurchaseModal from './CreditPurchaseModal';
import EdgeTypesGuide from './EdgeTypesGuide';
import * as atlas from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.min.css';

interface Point {
  position: atlas.data.Position;
}

interface RoofFacet {
  id: string;
  name: string;
  points: Point[];
  polygon: atlas.Shape | null;
  areaSqFt: number;
  pitch?: string;
}

interface RoofEdgeLine {
  id: string;
  facetId: string;
  points: [atlas.data.Position, atlas.data.Position];
  edgeType: EdgeType;
  lengthFt: number;
  line: atlas.Shape | null;
  shared: boolean;
}

interface AzureRoofrMeasurementProps {
  address: string;
  leadId?: string;
  mapProvider: 'satellite';
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

const AzureRoofrMeasurement: React.FC<AzureRoofrMeasurementProps> = ({
  address,
  leadId,
  mapProvider,
  onSave,
  onCancel
}) => {
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [dataSource, setDataSource] = useState<atlas.source.DataSource | null>(null);
  const [facets, setFacets] = useState<RoofFacet[]>([]);
  const [edges, setEdges] = useState<RoofEdgeLine[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType>('Eave');
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFacet, setSelectedFacet] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const azureApiKey = import.meta.env.VITE_AZURE_MAPS_KEY;

  useEffect(() => {
    loadCredits();
    const timer = setTimeout(() => {
      initializeMap();
    }, 100);
    return () => {
      clearTimeout(timer);
      cleanupMap();
    };
  }, []);

  const cleanupMap = () => {
    if (map) {
      map.dispose();
    }
  };

  const loadCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data: creditsData } = await supabase
        .from('measurement_credits')
        .select('credits_remaining')
        .eq('company_id', userData.company_id)
        .maybeSingle();

      setCredits(creditsData?.credits_remaining || 0);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const initializeMap = async () => {
    console.log('Azure Maps - initializeMap called');
    console.log('mapRef.current:', mapRef.current);
    console.log('azureApiKey:', azureApiKey);
    console.log('azureApiKey type:', typeof azureApiKey);
    console.log('azureApiKey length:', azureApiKey?.length);

    setMapLoading(true);

    if (!mapRef.current) {
      console.error('Map ref not available');
      setMapError('Map container not ready');
      setMapLoading(false);
      return;
    }

    if (!azureApiKey) {
      console.error('Azure API key not found');
      setMapError('Azure Maps API key not configured');
      setMapLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureApiKey}&query=${encodeURIComponent(address)}`
      );
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        setMapError('Address not found');
        setMapLoading(false);
        return;
      }

      const location = data.results[0].position;

      const mapInstance = new atlas.Map(mapRef.current, {
        center: [location.lon, location.lat],
        zoom: 20,
        style: 'satellite',
        authOptions: {
          authType: atlas.AuthenticationType.subscriptionKey,
          subscriptionKey: azureApiKey
        }
      });

      mapInstance.events.add('ready', () => {
        const ds = new atlas.source.DataSource();
        mapInstance.sources.add(ds);
        setDataSource(ds);

        const polygonLayer = new atlas.layer.PolygonLayer(ds, undefined, {
          fillColor: ['get', 'fillColor'],
          fillOpacity: 0.2
        });

        const lineLayer = new atlas.layer.LineLayer(ds, undefined, {
          strokeColor: ['get', 'strokeColor'],
          strokeWidth: ['get', 'strokeWidth']
        });

        const symbolLayer = new atlas.layer.SymbolLayer(ds, undefined, {
          iconOptions: {
            image: 'marker-blue',
            allowOverlap: true,
            ignorePlacement: true,
            size: 0.5
          },
          filter: ['any', ['==', ['get', 'isTemporary'], true], ['==', ['geometry-type'], 'Point']]
        });

        mapInstance.layers.add([polygonLayer, lineLayer, symbolLayer]);

        mapInstance.events.add('click', lineLayer, (e: any) => {
          if (e.shapes && e.shapes.length > 0) {
            const shape = e.shapes[0];
            const edgeId = shape.getProperties().edgeId;
            if (edgeId && !isDrawingRef.current) {
              handleEdgeClick(edgeId);
              e.preventDefault();
            }
          }
        });

        mapInstance.events.add('click', (e: any) => {
          if (isDrawingRef.current && ds) {
            handleMapClick(e);
          }
        });

        setMap(mapInstance);
        setMapLoading(false);
      });

      mapInstance.events.add('error', () => {
        setMapError('Failed to load map');
        setMapLoading(false);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to load map');
      setMapLoading(false);
    }
  };

  const handleMapClick = (e: any) => {
    if (!dataSource || !isDrawing) return;

    const position = e.position;
    const point: Point = { position };

    if (currentPoints.length > 0) {
      const firstPoint = currentPoints[0];
      const distance = atlas.math.getDistanceTo(firstPoint.position, position);

      if (distance < 5 && currentPoints.length >= 3) {
        completePolygon();
        return;
      }
    }

    setCurrentPoints(prev => {
      const newPoints = [...prev, point];
      updateCurrentPolyline(newPoints);
      return newPoints;
    });
  };

  const updateCurrentPolyline = (points: Point[]) => {
    if (!dataSource) return;

    const existingShapes = dataSource.getShapes();
    existingShapes.forEach(shape => {
      const props = shape.getProperties();
      if (props.isTemporary) {
        dataSource.remove(shape);
      }
    });

    if (points.length > 1) {
      const positions = points.map(p => p.position);
      const line = new atlas.Shape(new atlas.data.LineString(positions));
      line.addProperty('strokeColor', '#3b82f6');
      line.addProperty('strokeWidth', 3);
      line.addProperty('isTemporary', true);
      dataSource.add(line);
    }

    points.forEach(point => {
      const marker = new atlas.Shape(new atlas.data.Point(point.position));
      marker.addProperty('isTemporary', true);
      dataSource.add(marker);
    });
  };

  const completePolygon = () => {
    if (currentPoints.length < 3 || !dataSource) return;

    if (!dataSource) return;

    const existingShapes = dataSource.getShapes();
    existingShapes.forEach(shape => {
      const props = shape.getProperties();
      if (props.isTemporary) {
        dataSource.remove(shape);
      }
    });

    const facetId = `facet-${Date.now()}`;
    const facetName = `Facet ${facets.length + 1}`;

    const positions = currentPoints.map(p => p.position);
    const polygon = new atlas.Shape(new atlas.data.Polygon([positions]));
    polygon.addProperty('fillColor', '#3b82f6');
    polygon.addProperty('strokeColor', '#3b82f6');
    polygon.addProperty('strokeWidth', 2);
    polygon.addProperty('facetId', facetId);
    dataSource.add(polygon);

    const areaSqFt = Math.round(calculatePolygonArea(positions) * 10.7639);

    const newFacet: RoofFacet = {
      id: facetId,
      name: facetName,
      points: [...currentPoints],
      polygon: polygon,
      areaSqFt: areaSqFt
    };

    setFacets(prev => [...prev, newFacet]);
    createEdgesForFacet(newFacet);
    clearCurrentDrawing();
  };

  const calculatePolygonArea = (positions: atlas.data.Position[]): number => {
    let area = 0;
    const R = 6371000;

    for (let i = 0; i < positions.length; i++) {
      const p1 = positions[i];
      const p2 = positions[(i + 1) % positions.length];

      const lat1 = p1[1] * Math.PI / 180;
      const lat2 = p2[1] * Math.PI / 180;
      const dLon = (p2[0] - p1[0]) * Math.PI / 180;

      area += (dLon * (2 + Math.sin(lat1) + Math.sin(lat2)));
    }

    area = Math.abs(area * R * R / 2);
    return area;
  };

  const createEdgesForFacet = (facet: RoofFacet) => {
    if (!dataSource) return;

    const newEdges: RoofEdgeLine[] = [];

    for (let i = 0; i < facet.points.length; i++) {
      const point1 = facet.points[i].position;
      const point2 = facet.points[(i + 1) % facet.points.length].position;

      const edgeKey = getEdgeKey(point1, point2);
      const existingEdge = edges.find(e => getEdgeKey(e.points[0], e.points[1]) === edgeKey);

      if (existingEdge) {
        existingEdge.shared = true;
        if (existingEdge.line) {
          existingEdge.line.addProperty('strokeWidth', 5);
        }
        continue;
      }

      const lengthFt = atlas.math.getDistanceTo(point1, point2) * 3.28084;
      const edgeId = `edge-${Date.now()}-${i}`;

      const line = new atlas.Shape(new atlas.data.LineString([point1, point2]));
      line.addProperty('strokeColor', EDGE_TYPE_CONFIGS['Eave'].strokeColor);
      line.addProperty('strokeWidth', 4);
      line.addProperty('edgeId', edgeId);
      dataSource.add(line);

      const newEdge: RoofEdgeLine = {
        id: edgeId,
        facetId: facet.id,
        points: [point1, point2],
        edgeType: 'Eave',
        lengthFt: lengthFt,
        line: line,
        shared: false
      };

      newEdges.push(newEdge);
    }

    setEdges(prev => [...prev, ...newEdges]);
  };

  const handleEdgeClick = (edgeId: string) => {
    if (!selectedEdgeType || !dataSource) return;

    setEdges(prev => prev.map(edge => {
      if (edge.id === edgeId && edge.line) {
        const config = EDGE_TYPE_CONFIGS[selectedEdgeType];
        edge.line.setProperties({
          ...edge.line.getProperties(),
          strokeColor: config.strokeColor
        });
        return { ...edge, edgeType: selectedEdgeType };
      }
      return edge;
    }));
  };

  const getEdgeKey = (p1: atlas.data.Position, p2: atlas.data.Position): string => {
    const key1 = `${p1[1].toFixed(8)},${p1[0].toFixed(8)}`;
    const key2 = `${p2[1].toFixed(8)},${p2[0].toFixed(8)}`;
    return [key1, key2].sort().join('|');
  };

  const clearCurrentDrawing = () => {
    if (dataSource) {
      const existingShapes = dataSource.getShapes();
      existingShapes.forEach(shape => {
        const props = shape.getProperties();
        if (props.isTemporary) {
          dataSource.remove(shape);
        }
      });
    }
    setCurrentPoints([]);
    setIsDrawing(false);
    isDrawingRef.current = false;
  };

  const startDrawing = () => {
    clearCurrentDrawing();
    setIsDrawing(true);
    isDrawingRef.current = true;
  };

  const cancelDrawing = () => {
    clearCurrentDrawing();
  };

  const handleUndo = () => {
    if (isDrawing && currentPoints.length > 0) {
      setCurrentPoints(prev => {
        const newPoints = prev.slice(0, -1);
        updateCurrentPolyline(newPoints);
        return newPoints;
      });
    } else if (!isDrawing && facets.length > 0) {
      const lastFacet = facets[facets.length - 1];
      if (lastFacet.polygon && dataSource) {
        dataSource.remove(lastFacet.polygon);
      }

      const facetEdges = edges.filter(e => e.facetId === lastFacet.id);
      facetEdges.forEach(edge => {
        if (edge.line && dataSource) {
          dataSource.remove(edge.line);
        }
      });

      setEdges(prev => prev.filter(e => e.facetId !== lastFacet.id));
      setFacets(prev => prev.slice(0, -1));
    }
  };

  const deleteFacet = (facetId: string) => {
    const facet = facets.find(f => f.id === facetId);
    if (!facet) return;

    if (!confirm(`Delete ${facet.name}?`)) return;

    if (facet.polygon && dataSource) {
      dataSource.remove(facet.polygon);
    }

    const facetEdges = edges.filter(e => e.facetId === facetId);
    facetEdges.forEach(edge => {
      if (edge.line && dataSource) {
        dataSource.remove(edge.line);
      }
    });

    setEdges(prev => prev.filter(e => e.facetId !== facetId));
    setFacets(prev => prev.filter(f => f.id !== facetId));
    setSelectedFacet(null);
  };

  const handleSave = async () => {
    if (credits < 1) {
      setShowCreditModal(true);
      return;
    }

    if (facets.length === 0) {
      alert('Please draw at least one roof facet before saving');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('No company found');

      const totalArea = facets.reduce((sum, facet) => sum + facet.areaSqFt, 0);

      const edgeTotals: Record<EdgeType, number> = {
        Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0
      };

      edges.forEach(edge => {
        edgeTotals[edge.edgeType] += edge.lengthFt;
      });

      const measurementData = {
        company_id: userData.company_id,
        address: address,
        total_area_sqft: totalArea,
        ridge_length: edgeTotals.Ridge,
        hip_length: edgeTotals.Hip,
        valley_length: edgeTotals.Valley,
        rake_length: edgeTotals.Rake,
        eave_length: edgeTotals.Eave,
        segments: facets.map(facet => ({
          name: facet.name,
          area_sqft: facet.areaSqFt,
          pitch: facet.pitch,
          geometry: facet.points.map(p => ({ lat: p.position[1], lon: p.position[0] }))
        })),
        lead_id: leadId || null,
        status: 'Completed',
        measurement_type: 'Manual'
      };

      const { data: measurement, error: measurementError } = await supabase
        .from('roof_measurements')
        .insert(measurementData)
        .select()
        .single();

      if (measurementError) throw measurementError;

      const edgesData = edges.map((edge, index) => ({
        measurement_id: measurement.id,
        edge_type: edge.edgeType,
        geometry: [
          { lat: edge.points[0][1], lon: edge.points[0][0] },
          { lat: edge.points[1][1], lon: edge.points[1][0] }
        ],
        length_ft: edge.lengthFt,
        auto_detected: false,
        confidence_score: 0,
        user_modified: true,
        display_order: index
      }));

      const { error: edgesError } = await supabase
        .from('roof_edges')
        .insert(edgesData);

      if (edgesError) {
        console.error('Error saving edges:', edgesError);
      }

      const { error: creditError } = await supabase.rpc('decrement_measurement_credits', {
        p_company_id: userData.company_id
      });

      if (creditError) throw creditError;

      onSave(measurement);
    } catch (error) {
      console.error('Error saving measurement:', error);
      alert('Failed to save measurement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getEdgeCounts = () => {
    const counts: Record<EdgeType, number> = {
      Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0
    };
    edges.forEach(edge => counts[edge.edgeType]++);
    return counts;
  };

  const totalArea = facets.reduce((sum, f) => sum + f.areaSqFt, 0);

  if (mapError) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md">
          <h3 className="text-xl font-bold text-red-900 mb-2">Map Error</h3>
          <p className="text-red-700 mb-4">{mapError}</p>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">{address}</h2>
              <p className="text-sm text-slate-400">Click to draw roof facets</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-700 border border-slate-600 px-4 py-2 rounded-lg">
              <span className="text-xs text-slate-400">Credits: </span>
              <span className="font-bold text-white">{credits}</span>
            </div>

            {!isDrawing ? (
              <button
                onClick={startDrawing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2 shadow-lg"
              >
                <Grid3x3 size={18} />
                Draw Facet
              </button>
            ) : (
              <>
                <button
                  onClick={completePolygon}
                  disabled={currentPoints.length < 3}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Complete
                </button>
                <button
                  onClick={cancelDrawing}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center gap-2"
                >
                  Cancel
                </button>
              </>
            )}

            <button
              onClick={handleUndo}
              disabled={(!isDrawing || currentPoints.length === 0) && facets.length === 0}
              className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Undo2 size={18} />
            </button>

            <button
              onClick={handleSave}
              disabled={saving || credits < 1 || facets.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium flex items-center gap-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {showSidebar && (
          <div className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Tag size={18} className="text-blue-400" />
                    Edge Types
                  </h3>
                  <button
                    onClick={() => setShowGuide(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Info size={14} />
                    Guide
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(EDGE_TYPE_CONFIGS).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => setSelectedEdgeType(type as EdgeType)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedEdgeType === type
                          ? 'border-white bg-slate-700 shadow-lg'
                          : 'border-slate-600 bg-slate-750 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-white text-sm">{config.label}</div>
                          <div className="text-xs text-slate-400">{config.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Layers size={18} className="text-purple-400" />
                  Roof Facets ({facets.length})
                </h3>
                <div className="space-y-2">
                  {facets.map(facet => (
                    <div
                      key={facet.id}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedFacet === facet.id
                          ? 'border-blue-400 bg-slate-700'
                          : 'border-slate-600 bg-slate-750'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-white text-sm">{facet.name}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {facet.areaSqFt.toLocaleString()} sq ft
                          </div>
                        </div>
                        <button
                          onClick={() => deleteFacet(facet.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Ruler size={18} className="text-emerald-400" />
                  Measurements
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white">
                    <span>Total Area:</span>
                    <span className="font-bold">{totalArea.toLocaleString()} sq ft</span>
                  </div>
                  {Object.entries(getEdgeCounts()).map(([type, count]) => {
                    if (count === 0) return null;
                    const length = edges
                      .filter(e => e.edgeType === type)
                      .reduce((sum, e) => sum + e.lengthFt, 0);
                    return (
                      <div key={type} className="flex justify-between text-slate-300">
                        <span>{type}:</span>
                        <span>{Math.round(length)} ft</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white p-2 rounded-r-lg shadow-lg hover:bg-slate-700 transition-colors z-10"
          style={{ left: showSidebar ? '320px' : '0' }}
        >
          {showSidebar ? <ChevronDown size={20} className="rotate-90" /> : <ChevronUp size={20} className="rotate-90" />}
        </button>

        <div ref={mapRef} className="flex-1" style={{ width: '100%', height: '100%' }} />

        {mapLoading && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-white font-medium">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {showCreditModal && (
        <CreditPurchaseModal
          currentCredits={credits}
          onClose={() => setShowCreditModal(false)}
          onPurchaseComplete={() => {
            setShowCreditModal(false);
            loadCredits();
          }}
        />
      )}

      {showGuide && (
        <EdgeTypesGuide
          isOpen={showGuide}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
};

export default AzureRoofrMeasurement;
