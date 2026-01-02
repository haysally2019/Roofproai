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
  label?: string;
  type?: 'outline' | 'hip' | 'valley' | 'ridge' | 'eave' | 'rake';
}

interface MeasurementToolProps {
  address: string;
  mapProvider: 'satellite' | 'satellite_road_labels';
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

const MeasurementTool: React.FC<MeasurementToolProps> = ({ address, mapProvider, onSave, onCancel }) => {
  const [step, setStep] = useState<'instructions' | 'measuring'>('instructions');
  const [mode, setMode] = useState<'placing-outline' | 'connecting-outline' | 'drawing-lines' | 'labeling-lines'>('placing-outline');
  const [outlinePoints, setOutlinePoints] = useState<Point[]>([]);
  const [outlineEdges, setOutlineEdges] = useState<Edge[]>([]);
  const [internalLines, setInternalLines] = useState<Edge[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [currentLineType, setCurrentLineType] = useState<'hip' | 'valley' | 'ridge' | 'eave' | 'rake'>('ridge');
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
  const outlinePointsRef = useRef<Point[]>([]);
  const outlineEdgesRef = useRef<Edge[]>([]);
  const internalLinesRef = useRef<Edge[]>([]);
  const selectedPointRef = useRef<string | null>(null);
  const selectedEdgeRef = useRef<string | null>(null);
  const modeRef = useRef<'placing-outline' | 'connecting-outline' | 'drawing-lines' | 'labeling-lines'>('placing-outline');
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
    outlinePointsRef.current = outlinePoints;
  }, [outlinePoints]);

  useEffect(() => {
    outlineEdgesRef.current = outlineEdges;
  }, [outlineEdges]);

  useEffect(() => {
    internalLinesRef.current = internalLines;
  }, [internalLines]);

  useEffect(() => {
    selectedPointRef.current = selectedPoint;
  }, [selectedPoint]);

  useEffect(() => {
    selectedEdgeRef.current = selectedEdge;
  }, [selectedEdge]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
    const position = e.position;
    if (!position) return;

    if (currentMode === 'placing-outline') {
      const newPoint: Point = {
        position: [position[0], position[1]],
        id: `point-${Date.now()}`
      };

      const newPoints = [...outlinePointsRef.current, newPoint];
      setOutlinePoints(newPoints);
      updateMapFeatures();
    } else if (currentMode === 'connecting-outline' || currentMode === 'drawing-lines') {
      const clickedPoint = findNearestPoint(position, outlinePointsRef.current);
      if (!clickedPoint) return;

      const currentSelected = selectedPointRef.current;
      if (!currentSelected) {
        setSelectedPoint(clickedPoint.id);
      } else {
        if (currentSelected === clickedPoint.id) {
          setSelectedPoint(null);
          return;
        }

        const allEdges = [...outlineEdgesRef.current, ...internalLinesRef.current];
        const edgeExists = allEdges.some(
          edge => (edge.startId === currentSelected && edge.endId === clickedPoint.id) ||
                  (edge.startId === clickedPoint.id && edge.endId === currentSelected)
        );

        if (!edgeExists) {
          const newEdge: Edge = {
            startId: currentSelected,
            endId: clickedPoint.id,
            id: `edge-${Date.now()}`,
            type: currentMode === 'connecting-outline' ? 'outline' : undefined
          };

          if (currentMode === 'connecting-outline') {
            const newEdges = [...outlineEdgesRef.current, newEdge];
            setOutlineEdges(newEdges);
          } else {
            const newLines = [...internalLinesRef.current, newEdge];
            setInternalLines(newLines);
          }
        }
        setSelectedPoint(null);
      }
    } else if (currentMode === 'labeling-lines') {
      const clickedEdge = findNearestEdge(position);
      if (clickedEdge) {
        setSelectedEdge(clickedEdge.id);
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

  const findNearestEdge = (position: atlas.data.Position): Edge | null => {
    const allEdges = [...outlineEdgesRef.current, ...internalLinesRef.current];
    if (allEdges.length === 0) return null;

    const threshold = 0.0001;
    let nearest: Edge | null = null;
    let minDistance = Infinity;

    allEdges.forEach(edge => {
      const startPoint = outlinePointsRef.current.find(p => p.id === edge.startId);
      const endPoint = outlinePointsRef.current.find(p => p.id === edge.endId);

      if (startPoint && endPoint) {
        const distance = pointToLineDistance(position, startPoint.position, endPoint.position);
        if (distance < minDistance && distance < threshold) {
          minDistance = distance;
          nearest = edge;
        }
      }
    });

    return nearest;
  };

  const pointToLineDistance = (point: atlas.data.Position, lineStart: atlas.data.Position, lineEnd: atlas.data.Position): number => {
    const A = point[0] - lineStart[0];
    const B = point[1] - lineStart[1];
    const C = lineEnd[0] - lineStart[0];
    const D = lineEnd[1] - lineStart[1];

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart[0];
      yy = lineStart[1];
    } else if (param > 1) {
      xx = lineEnd[0];
      yy = lineEnd[1];
    } else {
      xx = lineStart[0] + param * C;
      yy = lineStart[1] + param * D;
    }

    const dx = point[0] - xx;
    const dy = point[1] - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const updateMapFeatures = () => {
    const ds = dataSourceRef.current;
    if (!ds) return;

    ds.clear();

    const highlightedPoint = selectedPointRef.current;
    const highlightedEdge = selectedEdgeRef.current;

    outlinePointsRef.current.forEach(point => {
      const feature = new atlas.data.Feature(new atlas.data.Point(point.position));
      feature.properties = {
        pointId: point.id,
        isHighlighted: point.id === highlightedPoint
      };
      ds.add(feature);
    });

    outlineEdgesRef.current.forEach(edge => {
      const startPoint = outlinePointsRef.current.find(p => p.id === edge.startId);
      const endPoint = outlinePointsRef.current.find(p => p.id === edge.endId);

      if (startPoint && endPoint) {
        const lineString = new atlas.data.LineString([startPoint.position, endPoint.position]);
        const feature = new atlas.data.Feature(lineString);
        feature.properties = {
          edgeId: edge.id,
          type: 'outline',
          isHighlighted: edge.id === highlightedEdge
        };
        ds.add(feature);
      }
    });

    internalLinesRef.current.forEach(edge => {
      const startPoint = outlinePointsRef.current.find(p => p.id === edge.startId);
      const endPoint = outlinePointsRef.current.find(p => p.id === edge.endId);

      if (startPoint && endPoint) {
        const lineString = new atlas.data.LineString([startPoint.position, endPoint.position]);
        const feature = new atlas.data.Feature(lineString);
        feature.properties = {
          edgeId: edge.id,
          type: edge.type || 'internal',
          label: edge.label,
          isHighlighted: edge.id === highlightedEdge
        };
        ds.add(feature);
      }
    });

    if (outlineEdgesRef.current.length >= 3) {
      const positions = outlinePointsRef.current.map(p => p.position);
      if (positions.length >= 3) {
        const closedPositions = [...positions, positions[0]];
        const poly = new atlas.data.Polygon([closedPositions]);
        ds.add(new atlas.data.Feature(poly));
      }
    }
  };

  const calculatePolygonArea = (positions: atlas.data.Position[]): number => {
    if (positions.length < 3) return 0;

    const closedPositions = [...positions, positions[0]];
    const polygon = new atlas.data.Polygon([closedPositions]);

    const areaMeters = atlas.math.getArea(polygon, 'squareMeters');
    const areaFeet = areaMeters * 10.7639;

    return Math.round(areaFeet);
  };

  const handleDonePlacingOutline = () => {
    if (outlinePoints.length < 3) {
      alert('You need at least 3 points to outline the roof');
      return;
    }
    setMode('connecting-outline');
  };

  const handleDoneConnectingOutline = () => {
    if (outlineEdges.length < 3) {
      alert('You need at least 3 edges to form the roof outline');
      return;
    }

    const positions = outlinePoints.map(p => p.position);
    const area = calculatePolygonArea(positions);
    setTotalArea(area);

    setMode('drawing-lines');
  };

  const handleDoneDrawingLines = () => {
    setMode('labeling-lines');
  };

  const handleAssignLineType = () => {
    if (!selectedEdge) {
      alert('Please select a line first');
      return;
    }

    const updatedLines = internalLines.map(line =>
      line.id === selectedEdge
        ? { ...line, type: currentLineType, label: currentLineType.charAt(0).toUpperCase() + currentLineType.slice(1) }
        : line
    );

    setInternalLines(updatedLines);
    setSelectedEdge(null);
    updateMapFeatures();
  };

  const handleUndoPoint = () => {
    if (outlinePoints.length === 0) return;

    const newPoints = outlinePoints.slice(0, -1);
    setOutlinePoints(newPoints);
    updateMapFeatures();
  };

  const handleUndoEdge = () => {
    if (mode === 'connecting-outline') {
      if (outlineEdges.length === 0) return;
      const newEdges = outlineEdges.slice(0, -1);
      setOutlineEdges(newEdges);
    } else {
      if (internalLines.length === 0) return;
      const newLines = internalLines.slice(0, -1);
      setInternalLines(newLines);
    }
    updateMapFeatures();
  };

  const handleReset = () => {
    setOutlinePoints([]);
    setOutlineEdges([]);
    setInternalLines([]);
    setSelectedPoint(null);
    setSelectedEdge(null);
    setTotalArea(0);
    setMode('placing-outline');
    if (dataSourceRef.current) {
      dataSourceRef.current.clear();
    }
  };

  const calculateLineLength = (edge: Edge): number => {
    const startPoint = outlinePoints.find(p => p.id === edge.startId);
    const endPoint = outlinePoints.find(p => p.id === edge.endId);

    if (!startPoint || !endPoint) return 0;

    const line = new atlas.data.LineString([startPoint.position, endPoint.position]);
    const lengthMeters = atlas.math.getLength(line, 'meters');
    const lengthFeet = lengthMeters * 3.28084;

    return Math.round(lengthFeet);
  };

  const handleSave = async () => {
    if (outlineEdges.length < 3) {
      alert('Please complete the roof outline before saving');
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

      const ridgeLength = internalLines
        .filter(line => line.type === 'ridge')
        .reduce((sum, line) => sum + calculateLineLength(line), 0);

      const hipLength = internalLines
        .filter(line => line.type === 'hip')
        .reduce((sum, line) => sum + calculateLineLength(line), 0);

      const valleyLength = internalLines
        .filter(line => line.type === 'valley')
        .reduce((sum, line) => sum + calculateLineLength(line), 0);

      const rakeLength = internalLines
        .filter(line => line.type === 'rake')
        .reduce((sum, line) => sum + calculateLineLength(line), 0);

      const eaveLength = internalLines
        .filter(line => line.type === 'eave')
        .reduce((sum, line) => sum + calculateLineLength(line), 0);

      const perimeter = outlineEdges.reduce((sum, edge) => sum + calculateLineLength(edge), 0);

      const segments = [{
        type: 'roof_section',
        geometry: outlinePoints.map(p => ({ lon: p.position[0], lat: p.position[1] })),
        area: totalArea,
        label: 'Full Roof',
        lines: internalLines.map(line => ({
          type: line.type,
          label: line.label,
          start: line.startId,
          end: line.endId,
          length: calculateLineLength(line)
        }))
      }];

      const measurementData = {
        company_id: userData.company_id,
        address: address,
        total_area_sqft: totalArea,
        segments: segments,
        ridge_length: ridgeLength,
        hip_length: hipLength,
        valley_length: valleyLength,
        rake_length: rakeLength,
        eave_length: eaveLength,
        perimeter: perimeter,
        measured_by: user.id,
        status: 'Completed'
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
                  <h3 className="font-bold text-slate-900 mb-1">Outline the Entire Roof</h3>
                  <p className="text-slate-600 text-sm">
                    Click on each corner of the roof to place all perimeter points, then connect them to form the complete roof outline.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Draw Internal Lines</h3>
                  <p className="text-slate-600 text-sm">
                    Click pairs of points to draw all internal lines (hips, valleys, ridges, etc.) across the roof.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Label All Lines</h3>
                  <p className="text-slate-600 text-sm">
                    Click each line and assign its type: Hip, Valley, Ridge, Eave, or Rake. This helps calculate accurate material requirements.
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
                    <li>• Place all perimeter points first, outlining the entire roof</li>
                    <li>• Connect points to form a closed perimeter outline</li>
                    <li>• Draw all internal lines (hips, valleys, ridges) at once</li>
                    <li>• Label each line type for accurate material calculations</li>
                    <li>• Use 'Undo' buttons to correct mistakes</li>
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
                {mode === 'placing-outline' && outlinePoints.length === 0 && 'Click on the map to place points at each corner of the roof perimeter'}
                {mode === 'placing-outline' && outlinePoints.length > 0 && `${outlinePoints.length} perimeter point${outlinePoints.length > 1 ? 's' : ''} placed - Continue placing or finish to connect`}
                {mode === 'connecting-outline' && !selectedPoint && `${outlineEdges.length} outline edge${outlineEdges.length !== 1 ? 's' : ''} drawn - Click a point to start connecting`}
                {mode === 'connecting-outline' && selectedPoint && 'Click another point to create an outline edge'}
                {mode === 'drawing-lines' && !selectedPoint && `${internalLines.length} internal line${internalLines.length !== 1 ? 's' : ''} drawn - Click pairs of points to draw hips, valleys, ridges`}
                {mode === 'drawing-lines' && selectedPoint && 'Click another point to draw a line'}
                {mode === 'labeling-lines' && !selectedEdge && 'Click on a line to select it, then assign its type'}
                {mode === 'labeling-lines' && selectedEdge && 'Select a line type and click Assign to label this line'}
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
              {mode === 'placing-outline' && (
                <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-slate-600">Perimeter Points: </span>
                  <span className="font-bold text-slate-900">{outlinePoints.length}</span>
                </div>
              )}

              {mode === 'connecting-outline' && (
                <>
                  <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-slate-600">Points: </span>
                    <span className="font-bold text-slate-900">{outlinePoints.length}</span>
                  </div>
                  <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-slate-600">Outline Edges: </span>
                    <span className="font-bold text-slate-900">{outlineEdges.length}</span>
                  </div>
                </>
              )}

              {(mode === 'drawing-lines' || mode === 'labeling-lines') && (
                <>
                  <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-slate-600">Internal Lines: </span>
                    <span className="font-bold text-slate-900">{internalLines.length}</span>
                  </div>
                  <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-slate-600">Labeled: </span>
                    <span className="font-bold text-slate-900">{internalLines.filter(l => l.type).length}</span>
                  </div>
                </>
              )}

              {totalArea > 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-emerald-700">Roof Area: </span>
                  <span className="font-bold text-emerald-900">{totalArea.toLocaleString()} sq ft</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {mode === 'placing-outline' && (
                <>
                  <button
                    onClick={handleDonePlacingOutline}
                    disabled={outlinePoints.length < 3}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronRight size={18} />
                    Done Placing Points
                  </button>

                  <button
                    onClick={handleUndoPoint}
                    disabled={outlinePoints.length === 0}
                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Undo2 size={18} />
                    Undo Point
                  </button>
                </>
              )}

              {mode === 'connecting-outline' && (
                <>
                  <button
                    onClick={handleDoneConnectingOutline}
                    disabled={outlineEdges.length < 3}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronRight size={18} />
                    Done with Outline
                  </button>

                  <button
                    onClick={handleUndoEdge}
                    disabled={outlineEdges.length === 0}
                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Undo2 size={18} />
                    Undo Edge
                  </button>
                </>
              )}

              {mode === 'drawing-lines' && (
                <>
                  <button
                    onClick={handleDoneDrawingLines}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <ChevronRight size={18} />
                    Done Drawing Lines
                  </button>

                  <button
                    onClick={handleUndoEdge}
                    disabled={internalLines.length === 0}
                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Undo2 size={18} />
                    Undo Line
                  </button>
                </>
              )}

              {mode === 'labeling-lines' && (
                <>
                  <select
                    value={currentLineType}
                    onChange={(e) => setCurrentLineType(e.target.value as any)}
                    className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="ridge">Ridge</option>
                    <option value="hip">Hip</option>
                    <option value="valley">Valley</option>
                    <option value="eave">Eave</option>
                    <option value="rake">Rake</option>
                  </select>

                  <button
                    onClick={handleAssignLineType}
                    disabled={!selectedEdge}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Check size={18} />
                    Assign Type
                  </button>
                </>
              )}

              <button
                onClick={handleReset}
                disabled={outlinePoints.length === 0 && outlineEdges.length === 0 && internalLines.length === 0}
                className="px-4 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCcw size={18} />
                Reset All
              </button>

              <button
                onClick={handleSave}
                disabled={saving || credits < 1 || outlineEdges.length < 3}
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
