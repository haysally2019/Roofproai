import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Check, X, CreditCard, AlertCircle, ChevronRight, Undo2, RotateCcw, Save, PenTool } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CreditPurchaseModal from './CreditPurchaseModal';
import * as atlas from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.min.css';

interface Point {
  position: atlas.data.Position;
  id: string;
}

interface Edge {
  startId: string;
  endId: string;
  id: string;
}

interface CompletedPolygon {
  points: Point[];
  edges: Edge[];
  area: number;
  label?: string;
}

interface MeasurementToolProps {
  address: string;
  mapProvider: 'satellite' | 'satellite_road_labels';
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

const MeasurementTool: React.FC<MeasurementToolProps> = ({ address, mapProvider, onSave, onCancel }) => {
  const [step, setStep] = useState<'instructions' | 'measuring'>('instructions');
  const [mode, setMode] = useState<'placing-points' | 'connecting-points' | 'labeling'>('placing-points');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [completedPolygons, setCompletedPolygons] = useState<CompletedPolygon[]>([]);
  const [currentLabel, setCurrentLabel] = useState<string>('');
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [dataSource, setDataSource] = useState<atlas.source.DataSource | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalArea, setTotalArea] = useState<number>(0);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const currentPointsRef = useRef<Point[]>([]);
  const currentEdgesRef = useRef<Edge[]>([]);
  const selectedPointRef = useRef<string | null>(null);
  const modeRef = useRef<'placing-points' | 'connecting-points' | 'labeling'>('placing-points');
  const completedPolygonsRef = useRef<CompletedPolygon[]>([]);
  const dataSourceRef = useRef<atlas.source.DataSource | null>(null);
  const azureApiKey = import.meta.env.VITE_AZURE_MAPS_KEY;

  useEffect(() => {
    loadCredits();
    return () => {
      cleanupMap();
    };
  }, []);

  useEffect(() => {
    if (step === 'measuring' && !map) {
      initializeMap();
    }
  }, [step]);

  useEffect(() => {
    currentPointsRef.current = currentPoints;
  }, [currentPoints]);

  useEffect(() => {
    currentEdgesRef.current = currentEdges;
  }, [currentEdges]);

  useEffect(() => {
    selectedPointRef.current = selectedPoint;
  }, [selectedPoint]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    completedPolygonsRef.current = completedPolygons;
  }, [completedPolygons]);

  useEffect(() => {
    dataSourceRef.current = dataSource;
  }, [dataSource]);

  const cleanupMap = () => {
    if (map) {
      try {
        map.dispose();
      } catch (error) {
        console.error('Error disposing map:', error);
      }
      setMap(null);
      setDataSource(null);
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

  const geocodeAddress = async (address: string): Promise<atlas.data.Position> => {
    if (!azureApiKey) throw new Error('Azure Maps API key not configured');

    const response = await fetch(
      `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureApiKey}&query=${encodeURIComponent(address)}`
    );
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('Address not found');
    }

    const location = data.results[0].position;
    return [location.lon, location.lat];
  };

  const initializeMap = async () => {
    if (!mapRef.current || !azureApiKey) {
      setMapError('Map configuration error');
      return;
    }

    setMapLoading(true);
    setMapError(null);

    try {
      const coords = await geocodeAddress(address);

      const newMap = new atlas.Map(mapRef.current, {
        center: coords,
        zoom: 19,
        view: 'Auto',
        authOptions: {
          authType: atlas.AuthenticationType.subscriptionKey,
          subscriptionKey: azureApiKey
        },
        style: mapProvider
      });

      newMap.events.add('ready', () => {
        const ds = new atlas.source.DataSource();
        newMap.sources.add(ds);
        setDataSource(ds);

        const polygonLayer = new atlas.layer.PolygonLayer(ds, undefined, {
          fillColor: 'rgba(59, 130, 246, 0.3)',
          fillOpacity: 0.5
        });

        const lineLayer = new atlas.layer.LineLayer(ds, undefined, {
          strokeColor: '#3b82f6',
          strokeWidth: 3
        });

        const symbolLayer = new atlas.layer.SymbolLayer(ds, undefined, {
          iconOptions: {
            image: 'marker-blue',
            size: 0.8
          }
        });

        newMap.layers.add([polygonLayer, lineLayer, symbolLayer]);

        newMap.events.add('click', handleMapClick);
        newMap.events.add('mousemove', handleMouseMove);
        newMap.events.add('mouseout', handleMouseOut);

        setMapLoading(false);
      });

      setMap(newMap);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to load map');
      setMapLoading(false);
    }
  };

  const handleMouseMove = (e: atlas.MapMouseEvent) => {
    if (mapRef.current && e.originalEvent) {
      const rect = mapRef.current.getBoundingClientRect();
      const mouseEvent = e.originalEvent as MouseEvent;
      setCursorPosition({
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top
      });
    }
  };

  const handleMouseOut = () => {
    setCursorPosition(null);
  };

  const handleMapClick = (e: atlas.MapMouseEvent) => {
    const currentMode = modeRef.current;

    if (currentMode === 'placing-points') {
      const position = e.position;
      if (!position) return;

      const newPoint: Point = {
        position: [position[0], position[1]],
        id: `point-${Date.now()}`
      };

      const newPoints = [...currentPointsRef.current, newPoint];
      setCurrentPoints(newPoints);
      updateMapFeatures(newPoints, currentEdgesRef.current, completedPolygonsRef.current);
    } else if (currentMode === 'connecting-points') {
      const position = e.position;
      if (!position) return;

      const clickedPoint = findNearestPoint(position, currentPointsRef.current);
      if (!clickedPoint) return;

      const currentSelected = selectedPointRef.current;
      if (!currentSelected) {
        setSelectedPoint(clickedPoint.id);
        updateMapFeatures(currentPointsRef.current, currentEdgesRef.current, completedPolygonsRef.current, clickedPoint.id);
      } else {
        if (currentSelected === clickedPoint.id) {
          setSelectedPoint(null);
          updateMapFeatures(currentPointsRef.current, currentEdgesRef.current, completedPolygonsRef.current);
          return;
        }

        const edgeExists = currentEdgesRef.current.some(
          edge => (edge.startId === currentSelected && edge.endId === clickedPoint.id) ||
                  (edge.startId === clickedPoint.id && edge.endId === currentSelected)
        );

        if (!edgeExists) {
          const newEdge: Edge = {
            startId: currentSelected,
            endId: clickedPoint.id,
            id: `edge-${Date.now()}`
          };

          const newEdges = [...currentEdgesRef.current, newEdge];
          setCurrentEdges(newEdges);
          setSelectedPoint(null);
          updateMapFeatures(currentPointsRef.current, newEdges, completedPolygonsRef.current);
        } else {
          setSelectedPoint(null);
          updateMapFeatures(currentPointsRef.current, currentEdgesRef.current, completedPolygonsRef.current);
        }
      }
    }
  };

  const findNearestPoint = (position: atlas.data.Position, points: Point[]): Point | null => {
    if (points.length === 0) return null;

    const threshold = 0.0001;
    let nearest: Point | null = null;
    let minDistance = Infinity;

    points.forEach(point => {
      const dx = point.position[0] - position[0];
      const dy = point.position[1] - position[1];
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance && distance < threshold) {
        minDistance = distance;
        nearest = point;
      }
    });

    return nearest;
  };

  const updateMapFeatures = (points: Point[], edges: Edge[], completed: CompletedPolygon[], highlightedPointId?: string) => {
    const ds = dataSourceRef.current;
    if (!ds) return;

    ds.clear();

    points.forEach(point => {
      const feature = new atlas.data.Feature(new atlas.data.Point(point.position));
      feature.properties = {
        pointId: point.id,
        isHighlighted: point.id === highlightedPointId
      };
      ds.add(feature);
    });

    edges.forEach(edge => {
      const startPoint = points.find(p => p.id === edge.startId);
      const endPoint = points.find(p => p.id === edge.endId);

      if (startPoint && endPoint) {
        const lineString = new atlas.data.LineString([startPoint.position, endPoint.position]);
        ds.add(new atlas.data.Feature(lineString));
      }
    });

    completed.forEach(polygon => {
      const positions = polygon.points.map(p => p.position);
      const closedPositions = [...positions, positions[0]];
      const poly = new atlas.data.Polygon([closedPositions]);
      ds.add(new atlas.data.Feature(poly));

      polygon.points.forEach(point => {
        ds.add(new atlas.data.Feature(new atlas.data.Point(point.position)));
      });
    });
  };

  const calculatePolygonArea = (positions: atlas.data.Position[]): number => {
    if (positions.length < 3) return 0;

    const closedPositions = [...positions, positions[0]];
    const polygon = new atlas.data.Polygon([closedPositions]);

    const areaMeters = atlas.math.getArea(polygon, 'squareMeters');
    const areaFeet = areaMeters * 10.7639;

    return Math.round(areaFeet);
  };

  const handleDonePlacingPoints = () => {
    if (currentPoints.length < 3) {
      alert('You need at least 3 points to continue');
      return;
    }
    setMode('connecting-points');
  };

  const handleDoneConnecting = () => {
    if (currentEdges.length < 3) {
      alert('You need at least 3 edges to form a shape');
      return;
    }

    const polygons = extractPolygons(currentPoints, currentEdges);
    if (polygons.length === 0) {
      alert('The edges do not form a closed shape. Please ensure your edges connect to form at least one polygon.');
      return;
    }

    setMode('labeling');
  };

  const extractPolygons = (points: Point[], edges: Edge[]): CompletedPolygon[] => {
    const polygons: CompletedPolygon[] = [];
    const edgeMap = new Map<string, string[]>();

    edges.forEach(edge => {
      if (!edgeMap.has(edge.startId)) edgeMap.set(edge.startId, []);
      if (!edgeMap.has(edge.endId)) edgeMap.set(edge.endId, []);
      edgeMap.get(edge.startId)!.push(edge.endId);
      edgeMap.get(edge.endId)!.push(edge.startId);
    });

    const visited = new Set<string>();
    const findCycle = (start: string, current: string, path: string[], pathSet: Set<string>): string[] | null => {
      if (path.length > 2 && current === start) {
        return path;
      }

      if (pathSet.has(current) || visited.has(current)) {
        return null;
      }

      const neighbors = edgeMap.get(current) || [];
      for (const neighbor of neighbors) {
        if (path.length > 0 && neighbor === path[path.length - 1]) continue;

        const newPath = [...path, current];
        const newPathSet = new Set(pathSet);
        newPathSet.add(current);

        const cycle = findCycle(start, neighbor, newPath, newPathSet);
        if (cycle) return cycle;
      }

      return null;
    };

    points.forEach(point => {
      if (visited.has(point.id)) return;

      const cycle = findCycle(point.id, point.id, [], new Set());
      if (cycle && cycle.length >= 3) {
        cycle.forEach(id => visited.add(id));

        const polygonPoints = cycle.map(id => points.find(p => p.id === id)!).filter(p => p);
        const polygonEdges = edges.filter(edge =>
          cycle.includes(edge.startId) && cycle.includes(edge.endId)
        );

        const positions = polygonPoints.map(p => p.position);
        const area = calculatePolygonArea(positions);

        polygons.push({
          points: polygonPoints,
          edges: polygonEdges,
          area: area
        });
      }
    });

    return polygons;
  };

  const handleSaveLabel = () => {
    if (!currentLabel.trim()) {
      alert('Please enter a label for this roof section');
      return;
    }

    const polygons = extractPolygons(currentPoints, currentEdges);
    const labeledPolygons = polygons.map(polygon => ({
      ...polygon,
      label: currentLabel
    }));

    const newCompleted = [...completedPolygons, ...labeledPolygons];
    setCompletedPolygons(newCompleted);

    const addedArea = polygons.reduce((sum, p) => sum + p.area, 0);
    setTotalArea(prev => prev + addedArea);

    setCurrentPoints([]);
    setCurrentEdges([]);
    setCurrentLabel('');
    setSelectedPoint(null);
    setMode('placing-points');
    updateMapFeatures([], [], newCompleted);
  };

  const handleUndoPoint = () => {
    if (currentPoints.length === 0) return;

    const newPoints = currentPoints.slice(0, -1);
    setCurrentPoints(newPoints);
    updateMapFeatures(newPoints, currentEdges, completedPolygons);
  };

  const handleUndoEdge = () => {
    if (currentEdges.length === 0) return;

    const newEdges = currentEdges.slice(0, -1);
    setCurrentEdges(newEdges);
    updateMapFeatures(currentPoints, newEdges, completedPolygons);
  };

  const handleUndoPolygon = () => {
    if (completedPolygons.length === 0) return;

    const lastPolygon = completedPolygons[completedPolygons.length - 1];
    setTotalArea(prev => Math.max(0, prev - lastPolygon.area));

    const newCompleted = completedPolygons.slice(0, -1);
    setCompletedPolygons(newCompleted);
    updateMapFeatures(currentPoints, currentEdges, newCompleted);
  };

  const handleReset = () => {
    setCurrentPoints([]);
    setCurrentEdges([]);
    setSelectedPoint(null);
    setCompletedPolygons([]);
    setTotalArea(0);
    setMode('placing-points');
    if (dataSourceRef.current) {
      dataSourceRef.current.clear();
    }
  };

  const handleCancelCurrent = () => {
    setCurrentPoints([]);
    setCurrentEdges([]);
    setSelectedPoint(null);
    setCurrentLabel('');
    setMode('placing-points');
    updateMapFeatures([], [], completedPolygons);
  };

  const handleSave = async () => {
    if (completedPolygons.length === 0) {
      alert('Please complete at least one roof section before saving');
      return;
    }

    if (currentPoints.length > 0) {
      alert('Please complete or clear the current shape before saving');
      return;
    }

    if (credits < 1) {
      setShowCreditModal(true);
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

      const segments = completedPolygons.map((polygon, index) => {
        const geometry = polygon.points.map(p => ({ lon: p.position[0], lat: p.position[1] }));

        return {
          type: 'roof_section',
          geometry: geometry,
          area: polygon.area,
          label: completedPolygons.length > 1 ? `Section ${index + 1}` : 'Main Roof'
        };
      });

      const measurementData = {
        company_id: userData.company_id,
        address: address,
        total_area: totalArea,
        segments: segments,
        created_at: new Date().toISOString()
      };

      const { data: measurement, error: measurementError } = await supabase
        .from('roof_measurements')
        .insert(measurementData)
        .select()
        .single();

      if (measurementError) throw measurementError;

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

  if (step === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <MapPin size={32} className="text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Roof Measurement Guide</h1>
              <p className="text-slate-600">Follow these steps for accurate measurements</p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Locate the Roof</h3>
                  <p className="text-slate-600 text-sm">
                    The map will center on your property. Pan and zoom to get the best view of the roof.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Place Pivot Points</h3>
                  <p className="text-slate-600 text-sm">
                    Click on each corner of the roof to place pivot points. Place all corner points before connecting them.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Connect the Points</h3>
                  <p className="text-slate-600 text-sm">
                    After placing all points, you'll be prompted to connect them by clicking pairs of points to draw edges between them.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Label the Section</h3>
                  <p className="text-slate-600 text-sm">
                    Once your edges form a closed shape, you'll be prompted to label the roof section (e.g., "North Face", "Main Roof").
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Save Your Measurement</h3>
                  <p className="text-slate-600 text-sm">
                    Review the calculated area and save the measurement. This will use 1 credit from your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-8">
              <div className="flex gap-3">
                <AlertCircle size={24} className="text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 mb-1">Tips for Precision</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Zoom to maximum level for best accuracy</li>
                    <li>• Click directly on roof corners to place pivot points</li>
                    <li>• Place all corner points first, then connect them</li>
                    <li>• Use 'Undo Point' or 'Undo Edge' to remove mistakes</li>
                    <li>• Edges must form a closed shape before labeling</li>
                    <li>• For complex roofs, measure multiple sections separately</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('measuring')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                Start Measuring
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{address}</h2>
              <p className="text-sm text-slate-500">
                {mode === 'placing-points' && currentPoints.length === 0 && 'Click on the map to place pivot points at each roof corner'}
                {mode === 'placing-points' && currentPoints.length > 0 && `${currentPoints.length} point${currentPoints.length > 1 ? 's' : ''} placed - Click to add more or finish placing`}
                {mode === 'connecting-points' && !selectedPoint && `${currentEdges.length} edge${currentEdges.length !== 1 ? 's' : ''} drawn - Click a point to start connecting`}
                {mode === 'connecting-points' && selectedPoint && 'Click another point to create an edge'}
                {mode === 'labeling' && 'Enter a label for this roof section'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 border-2 border-blue-200 px-4 py-2 rounded-lg">
                <span className="text-sm text-blue-700 font-medium">Credits: </span>
                <span className="font-bold text-blue-900">{credits}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mode === 'placing-points' && (
                <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-slate-600">Points Placed: </span>
                  <span className="font-bold text-slate-900">{currentPoints.length}</span>
                </div>
              )}

              {mode === 'connecting-points' && (
                <>
                  <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-slate-600">Points: </span>
                    <span className="font-bold text-slate-900">{currentPoints.length}</span>
                  </div>
                  <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-slate-600">Edges: </span>
                    <span className="font-bold text-slate-900">{currentEdges.length}</span>
                  </div>
                </>
              )}

              {mode === 'labeling' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-blue-700">Ready to Label</span>
                </div>
              )}

              <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                <span className="text-sm text-slate-600">Completed Sections: </span>
                <span className="font-bold text-slate-900">{completedPolygons.length}</span>
              </div>

              {totalArea > 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-emerald-700">Total Area: </span>
                  <span className="font-bold text-emerald-900">{totalArea.toLocaleString()} sq ft</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {mode === 'placing-points' && (
                <>
                  <button
                    onClick={handleDonePlacingPoints}
                    disabled={currentPoints.length < 3}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronRight size={18} />
                    Done Placing Points
                  </button>

                  <button
                    onClick={handleUndoPoint}
                    disabled={currentPoints.length === 0}
                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Undo2 size={18} />
                    Undo Point
                  </button>
                </>
              )}

              {mode === 'connecting-points' && (
                <>
                  <button
                    onClick={handleDoneConnecting}
                    disabled={currentEdges.length < 3}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronRight size={18} />
                    Done Connecting
                  </button>

                  <button
                    onClick={handleUndoEdge}
                    disabled={currentEdges.length === 0}
                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Undo2 size={18} />
                    Undo Edge
                  </button>

                  <button
                    onClick={handleCancelCurrent}
                    className="px-4 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium flex items-center gap-2"
                  >
                    <X size={18} />
                    Cancel Section
                  </button>
                </>
              )}

              {mode === 'labeling' && (
                <>
                  <input
                    type="text"
                    value={currentLabel}
                    onChange={(e) => setCurrentLabel(e.target.value)}
                    placeholder="Enter label (e.g., North Face)"
                    className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />

                  <button
                    onClick={handleSaveLabel}
                    disabled={!currentLabel.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Check size={18} />
                    Save Section
                  </button>

                  <button
                    onClick={handleCancelCurrent}
                    className="px-4 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium flex items-center gap-2"
                  >
                    <X size={18} />
                    Cancel Section
                  </button>
                </>
              )}

              <button
                onClick={handleUndoPolygon}
                disabled={completedPolygons.length === 0}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Undo2 size={18} />
                Undo Section
              </button>

              <button
                onClick={handleReset}
                disabled={currentPoints.length === 0 && currentEdges.length === 0 && completedPolygons.length === 0}
                className="px-4 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCcw size={18} />
                Reset All
              </button>

              <button
                onClick={handleSave}
                disabled={saving || credits < 1 || completedPolygons.length === 0 || mode !== 'placing-points'}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Measurement'}
              </button>

              <button
                onClick={onCancel}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Loading map...</p>
              </div>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-50">
              <div className="text-center max-w-md">
                <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-900 mb-2">Map Error</h3>
                <p className="text-red-700 mb-4">{mapError}</p>
                <button
                  onClick={() => {
                    setMapError(null);
                    initializeMap();
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {cursorPosition && (
            <div className="absolute inset-0 pointer-events-none z-40">
              <div
                className="absolute w-0.5 bg-blue-500 opacity-70"
                style={{
                  left: `${cursorPosition.x}px`,
                  top: 0,
                  bottom: 0,
                  boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                }}
              />
              <div
                className="absolute h-0.5 bg-blue-500 opacity-70"
                style={{
                  top: `${cursorPosition.y}px`,
                  left: 0,
                  right: 0,
                  boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                }}
              />
              <div
                className="absolute w-3 h-3 border-2 border-blue-500 rounded-full bg-white"
                style={{
                  left: `${cursorPosition.x - 6}px`,
                  top: `${cursorPosition.y - 6}px`,
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)'
                }}
              />
            </div>
          )}

          <div ref={mapRef} className="w-full h-full" />
        </div>
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
    </>
  );
};

export default MeasurementTool;
