import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronRight, X, Save, Undo2, RotateCcw, ZoomIn, ZoomOut, Crosshair, Tag, Layers, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoofEdge, EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import EdgeTypeSelector from './EdgeTypeSelector';
import EdgeTypesGuide from './EdgeTypesGuide';
import CreditPurchaseModal from './CreditPurchaseModal';

declare global {
  interface Window {
    google: any;
  }
}

interface Point {
  id: string;
  lat: number;
  lng: number;
  marker?: any;
}

interface Slope {
  id: string;
  name: string;
  pointIds: string[];
  polygon?: any;
  areaSqFt: number;
}

interface Edge {
  id: string;
  pointIds: [string, string];
  edgeType: EdgeType;
  lengthFt: number;
  polyline?: any;
}

interface RoofMeasurementWorkflowProps {
  address: string;
  leadId?: string;
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

type WorkflowStep = 'instructions' | 'pivot-points' | 'slopes' | 'edges';

const RoofMeasurementWorkflow: React.FC<RoofMeasurementWorkflowProps> = ({
  address,
  leadId,
  onSave,
  onCancel
}) => {
  const [step, setStep] = useState<WorkflowStep>('instructions');
  const [map, setMap] = useState<any>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [slopes, setSlopes] = useState<Slope[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(21);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    loadCredits();
  }, []);

  useEffect(() => {
    if (step === 'pivot-points' && !map) {
      loadGoogleMaps();
    }
  }, [step]);

  useEffect(() => {
    if (map) {
      const zoomListener = map.addListener('zoom_changed', () => {
        setZoomLevel(map.getZoom());
      });
      return () => {
        if (window.google?.maps?.event) {
          window.google.maps.event.removeListener(zoomListener);
        }
      };
    }
  }, [map]);

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

  const loadGoogleMaps = () => {
    if (!googleApiKey) {
      setMapError('Google Maps API key not configured');
      return;
    }

    setMapLoading(true);

    const onScriptLoad = () => {
      if (!window.google?.maps) {
        setMapError('Google Maps loaded but API objects are missing');
        return;
      }
      initializeMap();
    };

    if (window.google?.maps) {
      onScriptLoad();
      return;
    }

    const scriptId = 'google-maps-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=drawing,geometry,places`;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', onScriptLoad);
      script.addEventListener('error', () => {
        setMapError('Network error loading Google Maps');
        setMapLoading(false);
      });
      document.head.appendChild(script);
    }
  };

  const initializeMap = async () => {
    if (!mapRef.current || !window.google?.maps) {
      setMapError('Map initialization failed');
      return;
    }

    try {
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ address: address }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;

          const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: location,
            zoom: 21,
            mapTypeId: 'satellite',
            tilt: 0,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: true,
            rotateControl: false,
            zoomControl: true,
            gestureHandling: 'greedy',
          });

          setMap(mapInstance);
          setMapLoading(false);

          mapInstance.addListener('click', (e: any) => {
            if (step === 'pivot-points') {
              addPivotPoint(e.latLng);
            }
          });
        } else {
          setMapError('Address not found');
          setMapLoading(false);
        }
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to load map');
      setMapLoading(false);
    }
  };

  const addPivotPoint = (latLng: any) => {
    if (!map) return;

    const pointId = `point-${Date.now()}`;
    const marker = new window.google.maps.Marker({
      position: latLng,
      map: map,
      draggable: true,
      label: {
        text: `${points.length + 1}`,
        color: 'white',
        fontWeight: 'bold'
      },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });

    marker.addListener('click', () => {
      if (step === 'slopes') {
        togglePointSelection(pointId);
      }
    });

    marker.addListener('dragend', (e: any) => {
      updatePointPosition(pointId, e.latLng);
    });

    const newPoint: Point = {
      id: pointId,
      lat: latLng.lat(),
      lng: latLng.lng(),
      marker: marker
    };

    setPoints(prev => [...prev, newPoint]);
  };

  const togglePointSelection = (pointId: string) => {
    setSelectedPointIds(prev => {
      if (prev.includes(pointId)) {
        return prev.filter(id => id !== pointId);
      } else {
        return [...prev, pointId];
      }
    });

    const point = points.find(p => p.id === pointId);
    if (point?.marker) {
      const isSelected = !selectedPointIds.includes(pointId);
      point.marker.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: isSelected ? '#10b981' : '#3b82f6',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      });
    }
  };

  const updatePointPosition = (pointId: string, latLng: any) => {
    setPoints(prev => prev.map(p =>
      p.id === pointId ? { ...p, lat: latLng.lat(), lng: latLng.lng() } : p
    ));

    slopes.forEach(slope => {
      if (slope.pointIds.includes(pointId) && slope.polygon) {
        updateSlopePolygon(slope);
      }
    });

    edges.forEach(edge => {
      if (edge.pointIds.includes(pointId) && edge.polyline) {
        updateEdgePolyline(edge);
      }
    });
  };

  const createSlope = () => {
    if (selectedPointIds.length < 3) {
      alert('Please select at least 3 points to create a slope');
      return;
    }

    const slopeId = `slope-${Date.now()}`;
    const slopeName = `Slope ${slopes.length + 1}`;

    const path = selectedPointIds.map(id => {
      const point = points.find(p => p.id === id);
      return new window.google.maps.LatLng(point!.lat, point!.lng);
    });

    const polygon = new window.google.maps.Polygon({
      paths: path,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: '#3b82f6',
      fillOpacity: 0.35,
      editable: false,
      draggable: false,
      map: map
    });

    const areaSqFt = Math.round(
      window.google.maps.geometry.spherical.computeArea(path) * 10.7639
    );

    const newSlope: Slope = {
      id: slopeId,
      name: slopeName,
      pointIds: [...selectedPointIds],
      polygon: polygon,
      areaSqFt: areaSqFt
    };

    setSlopes(prev => [...prev, newSlope]);
    setSelectedPointIds([]);

    points.forEach(point => {
      if (point.marker) {
        point.marker.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        });
      }
    });
  };

  const updateSlopePolygon = (slope: Slope) => {
    if (!slope.polygon) return;

    const path = slope.pointIds.map(id => {
      const point = points.find(p => p.id === id);
      return new window.google.maps.LatLng(point!.lat, point!.lng);
    });

    slope.polygon.setPath(path);
  };


  const updateEdgeType = (edgeId: string, newType: EdgeType) => {
    setEdges(prev => prev.map(edge => {
      if (edge.id === edgeId) {
        const config = EDGE_TYPE_CONFIGS[newType];
        if (edge.polyline) {
          edge.polyline.setOptions({
            strokeColor: config.strokeColor
          });
        }
        return { ...edge, edgeType: newType };
      }
      return edge;
    }));
  };

  const updateEdgePolyline = (edge: Edge) => {
    if (!edge.polyline) return;

    const point1 = points.find(p => p.id === edge.pointIds[0]);
    const point2 = points.find(p => p.id === edge.pointIds[1]);

    if (point1 && point2) {
      edge.polyline.setPath([
        { lat: point1.lat, lng: point1.lng },
        { lat: point2.lat, lng: point2.lng }
      ]);
    }
  };

  const handleUndo = () => {
    if (step === 'pivot-points' && points.length > 0) {
      const lastPoint = points[points.length - 1];
      if (lastPoint.marker) {
        lastPoint.marker.setMap(null);
      }
      setPoints(prev => prev.slice(0, -1));
    } else if (step === 'slopes' && slopes.length > 0) {
      const lastSlope = slopes[slopes.length - 1];
      if (lastSlope.polygon) {
        lastSlope.polygon.setMap(null);
      }
      setSlopes(prev => prev.slice(0, -1));
    } else if (step === 'edges' && edges.length > 0) {
      const lastEdge = edges[edges.length - 1];
      if (lastEdge.polyline) {
        lastEdge.polyline.setMap(null);
      }
      setEdges(prev => prev.slice(0, -1));
    }
  };

  const handleReset = () => {
    if (step === 'pivot-points') {
      points.forEach(point => point.marker?.setMap(null));
      setPoints([]);
    } else if (step === 'slopes') {
      slopes.forEach(slope => slope.polygon?.setMap(null));
      setSlopes([]);
      setSelectedPointIds([]);
    } else if (step === 'edges') {
      edges.forEach(edge => edge.polyline?.setMap(null));
      setEdges([]);
    }
  };

  const handleNext = () => {
    if (step === 'instructions') {
      setStep('pivot-points');
    } else if (step === 'pivot-points') {
      if (points.length < 3) {
        alert('Please place at least 3 pivot points before continuing');
        return;
      }
      setStep('slopes');
    } else if (step === 'slopes') {
      if (slopes.length === 0) {
        alert('Please create at least one slope before continuing');
        return;
      }
      extractEdgesFromSlopes();
      setStep('edges');
    }
  };

  const extractEdgesFromSlopes = () => {
    const edgeMap = new Map<string, { point1Id: string; point2Id: string }>();

    slopes.forEach(slope => {
      for (let i = 0; i < slope.pointIds.length; i++) {
        const point1Id = slope.pointIds[i];
        const point2Id = slope.pointIds[(i + 1) % slope.pointIds.length];

        const edgeKey = [point1Id, point2Id].sort().join('-');

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, { point1Id, point2Id });
        }
      }
    });

    const newEdges: Edge[] = [];
    edgeMap.forEach(({ point1Id, point2Id }) => {
      const point1 = points.find(p => p.id === point1Id);
      const point2 = points.find(p => p.id === point2Id);

      if (!point1 || !point2) return;

      const edgeId = `edge-${Date.now()}-${Math.random()}`;
      const config = EDGE_TYPE_CONFIGS['Unlabeled'];

      const polyline = new window.google.maps.Polyline({
        path: [
          { lat: point1.lat, lng: point1.lng },
          { lat: point2.lat, lng: point2.lng }
        ],
        strokeColor: config.strokeColor,
        strokeOpacity: 1,
        strokeWeight: 4,
        clickable: true,
        map: map
      });

      const R = 6371e3;
      const φ1 = point1.lat * Math.PI / 180;
      const φ2 = point2.lat * Math.PI / 180;
      const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
      const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const lengthFt = R * c * 3.28084;

      polyline.addListener('click', () => {
        if (selectedEdgeType) {
          updateEdgeType(edgeId, selectedEdgeType);
        }
      });

      const newEdge: Edge = {
        id: edgeId,
        pointIds: [point1Id, point2Id],
        edgeType: 'Unlabeled',
        lengthFt: lengthFt,
        polyline: polyline
      };

      newEdges.push(newEdge);
    });

    setEdges(newEdges);
  };

  const handleSave = async () => {
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

      const totalArea = slopes.reduce((sum, slope) => sum + slope.areaSqFt, 0);

      const edgeCounts: Record<EdgeType, number> = {
        Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0
      };

      edges.forEach(edge => {
        edgeCounts[edge.edgeType]++;
      });

      const measurementData = {
        company_id: userData.company_id,
        address: address,
        total_area_sqft: totalArea,
        ridge_length: edges.filter(e => e.edgeType === 'Ridge').reduce((sum, e) => sum + e.lengthFt, 0),
        hip_length: edges.filter(e => e.edgeType === 'Hip').reduce((sum, e) => sum + e.lengthFt, 0),
        valley_length: edges.filter(e => e.edgeType === 'Valley').reduce((sum, e) => sum + e.lengthFt, 0),
        rake_length: edges.filter(e => e.edgeType === 'Rake').reduce((sum, e) => sum + e.lengthFt, 0),
        eave_length: edges.filter(e => e.edgeType === 'Eave').reduce((sum, e) => sum + e.lengthFt, 0),
        segments: slopes.map(slope => ({
          name: slope.name,
          area_sqft: slope.areaSqFt,
          geometry: slope.pointIds.map(id => {
            const point = points.find(p => p.id === id);
            return { lat: point!.lat, lng: point!.lng };
          })
        })),
        lead_id: leadId || null,
        status: 'Completed'
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
        geometry: edge.pointIds.map(id => {
          const point = points.find(p => p.id === id);
          return { lat: point!.lat, lng: point!.lng };
        }),
        length_ft: edge.lengthFt,
        auto_detected: false,
        confidence_score: 0,
        user_modified: edge.edgeType !== 'Unlabeled',
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

  if (step === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <MapPin size={32} className="text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Professional Roof Measurement</h1>
              <p className="text-slate-600">Follow this 3-step process for accurate measurements</p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Circle size={18} className="text-blue-600" />
                    Place Pivot Points
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Click on the map to place points at each corner and key location of the roof structure. These are your reference points.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Layers size={18} className="text-purple-600" />
                    Define Slopes (Roof Planes)
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Select 3 or more pivot points and click "Create Slope" to define each roof plane. Create one slope for each distinct roof surface.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Tag size={18} className="text-green-600" />
                    Label Edges
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Identify each edge type: Ridges (top peaks), Hips (external angles), Valleys (internal angles), Eaves (bottom edges), Rakes (gable edges), and Penetrations.
                  </p>
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
                onClick={handleNext}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                Start Measurement
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{address}</h2>
            <div className="flex items-center gap-4 mt-1">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${step === 'pivot-points' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                <Circle size={16} />
                <span className="text-sm font-medium">1. Points ({points.length})</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${step === 'slopes' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                <Layers size={16} />
                <span className="text-sm font-medium">2. Slopes ({slopes.length})</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${step === 'edges' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                <Tag size={16} />
                <span className="text-sm font-medium">3. Edges ({edges.filter(e => e.edgeType !== 'Unlabeled').length}/{edges.length})</span>
              </div>
            </div>
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
            {step === 'pivot-points' && (
              <p className="text-sm text-slate-600">Click on the map to place pivot points at roof corners</p>
            )}
            {step === 'slopes' && (
              <p className="text-sm text-slate-600">
                {selectedPointIds.length === 0 ? 'Click points to select them (need 3+), then click Create Slope' :
                 `${selectedPointIds.length} points selected - ${selectedPointIds.length >= 3 ? 'Click Create Slope' : 'Select more points'}`}
              </p>
            )}
            {step === 'edges' && selectedEdgeType && (
              <p className="text-sm text-slate-600">
                Click edges on the map to mark them as <strong>{selectedEdgeType}</strong>
              </p>
            )}
            {step === 'edges' && !selectedEdgeType && (
              <p className="text-sm text-slate-600">Select an edge type, then click edges to label them</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={
                (step === 'pivot-points' && points.length === 0) ||
                (step === 'slopes' && slopes.length === 0) ||
                (step === 'edges' && edges.length === 0)
              }
              className="px-3 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Undo2 size={18} />
              Undo
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Reset
            </button>

            {step === 'slopes' && (
              <button
                onClick={createSlope}
                disabled={selectedPointIds.length < 3}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Layers size={18} />
                Create Slope
              </button>
            )}

            {step === 'edges' && (
              <button
                onClick={() => setShowGuide(true)}
                className="px-4 py-2 border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center gap-2"
              >
                Help
              </button>
            )}

            {step !== 'edges' && (
              <button
                onClick={handleNext}
                disabled={
                  (step === 'pivot-points' && points.length < 3) ||
                  (step === 'slopes' && slopes.length === 0)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next Step
                <ChevronRight size={18} />
              </button>
            )}

            {step === 'edges' && (
              <button
                onClick={handleSave}
                disabled={saving || credits < 1}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Measurement'}
              </button>
            )}

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

      <div className="flex-1 flex relative">
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
              <h3 className="text-xl font-bold text-red-900 mb-2">Map Error</h3>
              <p className="text-red-700 mb-4">{mapError}</p>
              <button
                onClick={() => {
                  setMapError(null);
                  loadGoogleMaps();
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {step === 'edges' && (
          <div className="w-96 bg-white border-r border-slate-200 p-4 overflow-y-auto">
            <EdgeTypeSelector
              selectedType={selectedEdgeType}
              onSelectType={setSelectedEdgeType}
              edgeCounts={getEdgeCounts()}
              unlabeledCount={edges.filter(e => e.edgeType === 'Unlabeled').length}
            />

            <div className="mt-4 space-y-2">
              <h3 className="font-semibold text-slate-900 mb-2">Edges Summary</h3>
              {Object.entries(getEdgeCounts()).map(([type, count]) => {
                if (count === 0) return null;
                const config = EDGE_TYPE_CONFIGS[type];
                return (
                  <div key={type} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="font-medium">{config.label}:</span>
                    <span className="text-slate-600">{count} edges</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div ref={mapRef} className="flex-1" />
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

export default RoofMeasurementWorkflow;
