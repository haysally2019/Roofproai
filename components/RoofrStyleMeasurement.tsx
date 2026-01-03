import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Undo2, Trash2, Tag, Layers, Grid3x3, Ruler, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoofEdge, EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import CreditPurchaseModal from './CreditPurchaseModal';
import EdgeTypesGuide from './EdgeTypesGuide';

declare global {
  interface Window {
    google: any;
  }
}

interface Point {
  lat: number;
  lng: number;
}

interface RoofFacet {
  id: string;
  name: string;
  points: Point[];
  polygon: any;
  areaSqFt: number;
  pitch?: string;
}

interface RoofEdgeLine {
  id: string;
  facetId: string;
  points: [Point, Point];
  edgeType: EdgeType;
  lengthFt: number;
  polyline: any;
  shared: boolean;
}

interface RoofrStyleMeasurementProps {
  address: string;
  leadId?: string;
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

const RoofrStyleMeasurement: React.FC<RoofrStyleMeasurementProps> = ({
  address,
  leadId,
  onSave,
  onCancel
}) => {
  const [map, setMap] = useState<any>(null);
  const [facets, setFacets] = useState<RoofFacet[]>([]);
  const [edges, setEdges] = useState<RoofEdgeLine[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentMarkers, setCurrentMarkers] = useState<any[]>([]);
  const [currentPolyline, setCurrentPolyline] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType>('Eave');
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFacet, setSelectedFacet] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    loadCredits();

    const timer = setTimeout(() => {
      loadGoogleMaps();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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
    console.log('loadGoogleMaps called');

    if (!googleApiKey) {
      console.error('Google Maps API key not configured');
      setMapError('Google Maps API key not configured');
      setMapLoading(false);
      return;
    }

    const onScriptLoad = () => {
      console.log('Google Maps script loaded, checking API...');
      if (!window.google?.maps) {
        console.error('Google Maps API not available after script load');
        setMapError('Google Maps failed to load');
        setMapLoading(false);
        return;
      }
      console.log('Google Maps API ready, initializing map');
      initializeMap();
    };

    if (window.google?.maps) {
      console.log('Google Maps already loaded');
      initializeMap();
      return;
    }

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      console.log('Google Maps script already exists in DOM');
      if (window.google?.maps) {
        initializeMap();
      } else {
        console.log('Waiting for existing script to load');
        existingScript.addEventListener('load', onScriptLoad);
      }
      return;
    }

    console.log('Creating new Google Maps script tag');
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', onScriptLoad);
    script.addEventListener('error', (err) => {
      console.error('Failed to load Google Maps script:', err);
      setMapError('Failed to load Google Maps');
      setMapLoading(false);
    });
    document.head.appendChild(script);
  };

  const initializeMap = async () => {
    if (!mapRef.current) {
      console.error('Map ref not available');
      setMapError('Map container not ready');
      setMapLoading(false);
      return;
    }

    if (!window.google?.maps) {
      console.error('Google Maps API not loaded');
      setMapError('Google Maps API not loaded');
      setMapLoading(false);
      return;
    }

    try {
      console.log('Geocoding address:', address);
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ address: address }, (results: any, status: any) => {
        console.log('Geocode status:', status, 'results:', results);

        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          console.log('Creating map at location:', location.toString());

          const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: location,
            zoom: 21,
            mapTypeId: 'satellite',
            tilt: 0,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            rotateControl: false,
            zoomControl: true,
            gestureHandling: 'greedy',
          });

          window.google.maps.event.addListenerOnce(mapInstance, 'tilesloaded', () => {
            console.log('Map tiles loaded successfully');
            setMap(mapInstance);
            setMapLoading(false);
          });

          mapInstance.addListener('click', (e: any) => handleMapClick(e.latLng));
        } else {
          console.error('Geocoding failed:', status);
          setMapError(`Address not found: ${status}`);
          setMapLoading(false);
        }
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to load map');
      setMapLoading(false);
    }
  };

  const handleMapClick = (latLng: any) => {
    if (!isDrawing || !map) return;

    const point: Point = { lat: latLng.lat(), lng: latLng.lng() };

    if (currentPoints.length > 0) {
      const firstPoint = currentPoints[0];
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(firstPoint.lat, firstPoint.lng),
        latLng
      );

      if (distance < 5 && currentPoints.length >= 3) {
        completePolygon();
        return;
      }
    }

    const marker = new window.google.maps.Marker({
      position: latLng,
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      },
      draggable: false
    });

    setCurrentMarkers(prev => [...prev, marker]);
    setCurrentPoints(prev => {
      const newPoints = [...prev, point];
      updateCurrentPolyline(newPoints);
      return newPoints;
    });
  };

  const updateCurrentPolyline = (points: Point[]) => {
    if (currentPolyline) {
      currentPolyline.setMap(null);
    }

    if (points.length > 1) {
      const polyline = new window.google.maps.Polyline({
        path: points,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: map
      });
      setCurrentPolyline(polyline);
    }
  };

  const completePolygon = () => {
    if (currentPoints.length < 3) return;

    const facetId = `facet-${Date.now()}`;
    const facetName = `Facet ${facets.length + 1}`;

    const polygon = new window.google.maps.Polygon({
      paths: currentPoints,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      editable: false,
      draggable: false,
      map: map
    });

    const path = currentPoints.map(p => new window.google.maps.LatLng(p.lat, p.lng));
    const areaSqFt = Math.round(
      window.google.maps.geometry.spherical.computeArea(path) * 10.7639
    );

    const newFacet: RoofFacet = {
      id: facetId,
      name: facetName,
      points: [...currentPoints],
      polygon: polygon,
      areaSqFt: areaSqFt
    };

    polygon.addListener('click', () => {
      setSelectedFacet(facetId);
    });

    setFacets(prev => [...prev, newFacet]);
    createEdgesForFacet(newFacet);
    clearCurrentDrawing();
  };

  const createEdgesForFacet = (facet: RoofFacet) => {
    const newEdges: RoofEdgeLine[] = [];

    for (let i = 0; i < facet.points.length; i++) {
      const point1 = facet.points[i];
      const point2 = facet.points[(i + 1) % facet.points.length];

      const edgeKey = getEdgeKey(point1, point2);
      const existingEdge = edges.find(e => getEdgeKey(e.points[0], e.points[1]) === edgeKey);

      if (existingEdge) {
        existingEdge.shared = true;
        existingEdge.polyline.setOptions({ strokeWeight: 5 });
        continue;
      }

      const lengthFt = calculateDistance(point1, point2);
      const edgeId = `edge-${Date.now()}-${i}`;

      const polyline = new window.google.maps.Polyline({
        path: [point1, point2],
        strokeColor: EDGE_TYPE_CONFIGS['Eave'].strokeColor,
        strokeOpacity: 1,
        strokeWeight: 4,
        clickable: true,
        map: map
      });

      polyline.addListener('click', () => handleEdgeClick(edgeId));

      const newEdge: RoofEdgeLine = {
        id: edgeId,
        facetId: facet.id,
        points: [point1, point2],
        edgeType: 'Eave',
        lengthFt: lengthFt,
        polyline: polyline,
        shared: false
      };

      newEdges.push(newEdge);
    }

    setEdges(prev => [...prev, ...newEdges]);
  };

  const handleEdgeClick = (edgeId: string) => {
    if (!selectedEdgeType) return;

    setEdges(prev => prev.map(edge => {
      if (edge.id === edgeId) {
        const config = EDGE_TYPE_CONFIGS[selectedEdgeType];
        edge.polyline.setOptions({
          strokeColor: config.strokeColor
        });
        return { ...edge, edgeType: selectedEdgeType };
      }
      return edge;
    }));
  };

  const getEdgeKey = (p1: Point, p2: Point): string => {
    const key1 = `${p1.lat.toFixed(8)},${p1.lng.toFixed(8)}`;
    const key2 = `${p2.lat.toFixed(8)},${p2.lng.toFixed(8)}`;
    return [key1, key2].sort().join('|');
  };

  const calculateDistance = (p1: Point, p2: Point): number => {
    const R = 6371e3;
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
    const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 3.28084;
  };

  const clearCurrentDrawing = () => {
    currentMarkers.forEach(marker => marker.setMap(null));
    if (currentPolyline) {
      currentPolyline.setMap(null);
    }
    setCurrentMarkers([]);
    setCurrentPoints([]);
    setCurrentPolyline(null);
    setIsDrawing(false);
  };

  const startDrawing = () => {
    clearCurrentDrawing();
    setIsDrawing(true);
  };

  const cancelDrawing = () => {
    clearCurrentDrawing();
  };

  const handleUndo = () => {
    if (isDrawing && currentPoints.length > 0) {
      const lastMarker = currentMarkers[currentMarkers.length - 1];
      if (lastMarker) {
        lastMarker.setMap(null);
      }
      setCurrentMarkers(prev => prev.slice(0, -1));
      setCurrentPoints(prev => {
        const newPoints = prev.slice(0, -1);
        updateCurrentPolyline(newPoints);
        return newPoints;
      });
    } else if (!isDrawing && facets.length > 0) {
      const lastFacet = facets[facets.length - 1];
      lastFacet.polygon.setMap(null);

      const facetEdges = edges.filter(e => e.facetId === lastFacet.id);
      facetEdges.forEach(edge => edge.polyline.setMap(null));

      setEdges(prev => prev.filter(e => e.facetId !== lastFacet.id));
      setFacets(prev => prev.slice(0, -1));
    }
  };

  const deleteFacet = (facetId: string) => {
    const facet = facets.find(f => f.id === facetId);
    if (!facet) return;

    if (!confirm(`Delete ${facet.name}?`)) return;

    facet.polygon.setMap(null);

    const facetEdges = edges.filter(e => e.facetId === facetId);
    facetEdges.forEach(edge => edge.polyline.setMap(null));

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
          geometry: facet.points
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
        geometry: edge.points,
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

  if (mapLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

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

export default RoofrStyleMeasurement;
