import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Check, X, AlertCircle, ChevronRight, Undo2, RotateCcw, Save, Maximize2, ZoomIn, ZoomOut, Crosshair, Move } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CreditPurchaseModal from './CreditPurchaseModal';

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleMeasurementToolProps {
  address: string;
  leadId?: string;
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

const GoogleMeasurementTool: React.FC<GoogleMeasurementToolProps> = ({ address, leadId, onSave, onCancel }) => {
  const [step, setStep] = useState<'instructions' | 'measuring'>('instructions');
  const [map, setMap] = useState<any>(null);
  const [drawingManager, setDrawingManager] = useState<any>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalArea, setTotalArea] = useState<number>(0);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(20);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    loadCredits();
    return () => {
      cleanupMap();
    };
  }, []);

  useEffect(() => {
    if (step === 'measuring' && !map) {
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

  const cleanupMap = () => {
    polygons.forEach(poly => poly.setMap(null));
    if (drawingManager) {
      drawingManager.setMap(null);
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

  const loadGoogleMaps = () => {
    if (!googleApiKey) {
      setMapError('Google Maps API key not configured');
      return;
    }

    setMapLoading(true);

    const scriptId = 'google-maps-script';

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
            zoom: 20,
            mapTypeId: 'satellite',
            tilt: 0,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: true,
            mapTypeControlOptions: {
              position: window.google.maps.ControlPosition.TOP_RIGHT,
            },
            rotateControl: false,
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_CENTER,
            },
            gestureHandling: 'greedy',
          });

          setMap(mapInstance);

          const manager = new window.google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
              fillColor: '#3b82f6',
              fillOpacity: 0.35,
              strokeWeight: 3,
              strokeColor: '#3b82f6',
              clickable: true,
              editable: true,
              draggable: false,
              zIndex: 1,
            },
          });

          manager.setMap(mapInstance);
          setDrawingManager(manager);

          window.google.maps.event.addListener(manager, 'overlaycomplete', (event: any) => {
            if (event.type === 'polygon') {
              const newPoly = event.overlay;
              const areaMeters = window.google.maps.geometry.spherical.computeArea(newPoly.getPath());
              const areaSqFt = Math.round(areaMeters * 10.7639);

              setTotalArea(prev => prev + areaSqFt);
              setPolygons(prev => [...prev, newPoly]);

              manager.setDrawingMode(null);
              setIsDrawing(false);
            }
          });

          setMapLoading(false);
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

  const handleStartDrawing = () => {
    if (drawingManager) {
      drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
      setIsDrawing(true);
    }
  };

  const handleCancelDrawing = () => {
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
      setIsDrawing(false);
    }
  };

  const handleUndo = () => {
    if (polygons.length === 0) return;

    const lastPolygon = polygons[polygons.length - 1];

    const areaMeters = window.google.maps.geometry.spherical.computeArea(lastPolygon.getPath());
    const areaSqFt = Math.round(areaMeters * 10.7639);

    lastPolygon.setMap(null);

    setPolygons(prev => prev.slice(0, -1));
    setTotalArea(prev => Math.max(0, prev - areaSqFt));
  };

  const handleReset = () => {
    polygons.forEach(poly => poly.setMap(null));
    setPolygons([]);
    setTotalArea(0);
    setIsDrawing(false);
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }
  };

  const handleZoomIn = () => {
    if (map) {
      map.setZoom(map.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      map.setZoom(map.getZoom() - 1);
    }
  };

  const handleRecenter = () => {
    if (map && polygons.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      polygons.forEach(poly => {
        const path = poly.getPath();
        path.forEach((point: any) => bounds.extend(point));
      });
      map.fitBounds(bounds);
    }
  };

  const handleSave = async () => {
    if (polygons.length === 0) {
      alert('Please draw at least one roof section before saving');
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

      const segments = polygons.map((poly, index) => {
        const path = poly.getPath();
        const points: any[] = [];
        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i);
          points.push({ lon: point.lng(), lat: point.lat() });
        }

        const areaMeters = window.google.maps.geometry.spherical.computeArea(path);
        const areaSqFt = Math.round(areaMeters * 10.7639);

        return {
          type: 'roof_section',
          geometry: points,
          area: areaSqFt,
          label: polygons.length > 1 ? `Section ${index + 1}` : 'Main Roof'
        };
      });

      const measurementData = {
        company_id: userData.company_id,
        address: address,
        total_area: totalArea,
        segments: segments,
        lead_id: leadId || null,
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
                    The map will center on your property. Use zoom controls and drag to position the roof perfectly in view.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Click 'Draw Roof Section'</h3>
                  <p className="text-slate-600 text-sm">
                    Click the blue "Draw Roof Section" button in the toolbar to activate drawing mode.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Draw the Roof Outline</h3>
                  <p className="text-slate-600 text-sm">
                    Click on each corner of the roof section. Click on the first point again to complete the shape, or double-click the last point.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
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
                    <li>• Zoom to maximum level (21+) for best accuracy</li>
                    <li>• Click directly on roof corners for precise measurements</li>
                    <li>• For complex roofs, draw multiple sections separately</li>
                    <li>• Use 'Undo Last' if you need to remove a section</li>
                    <li>• The map is editable - drag corner points to adjust</li>
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
                {isDrawing ? 'Click on map corners to draw the roof outline' : 'Click "Draw Roof Section" to start measuring'}
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
              <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                <span className="text-sm text-slate-600">Sections: </span>
                <span className="font-bold text-slate-900">{polygons.length}</span>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2">
                <span className="text-sm text-slate-600">Zoom: </span>
                <span className="font-bold text-slate-900">{zoomLevel}</span>
              </div>

              {totalArea > 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-emerald-700">Total Area: </span>
                  <span className="font-bold text-emerald-900">{totalArea.toLocaleString()} sq ft</span>
                </div>
              )}

              {isDrawing && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
                  <PenTool size={16} className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">Drawing Mode Active</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomIn}
                className="px-3 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>

              <button
                onClick={handleZoomOut}
                className="px-3 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>

              <button
                onClick={handleRecenter}
                disabled={polygons.length === 0}
                className="px-3 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Re-center"
              >
                <Crosshair size={18} />
              </button>

              <div className="w-px h-8 bg-slate-300 mx-1"></div>

              {!isDrawing ? (
                <button
                  onClick={handleStartDrawing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <PenTool size={18} />
                  Draw Roof Section
                </button>
              ) : (
                <button
                  onClick={handleCancelDrawing}
                  className="px-4 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium flex items-center gap-2"
                >
                  <X size={18} />
                  Cancel Drawing
                </button>
              )}

              <button
                onClick={handleUndo}
                disabled={polygons.length === 0}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Undo2 size={18} />
                Undo Last
              </button>

              <button
                onClick={handleReset}
                disabled={polygons.length === 0}
                className="px-4 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCcw size={18} />
                Reset All
              </button>

              <button
                onClick={handleSave}
                disabled={saving || credits < 1 || polygons.length === 0}
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
                <p className="text-slate-600 font-medium">Loading Google Maps...</p>
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
                    loadGoogleMaps();
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          <div ref={mapRef} className="w-full h-full" />

          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl border-2 border-slate-200 px-6 py-3">
            <p className="text-sm text-slate-600">
              {!isDrawing && polygons.length === 0 && "Click 'Draw Roof Section' to start measuring"}
              {!isDrawing && polygons.length > 0 && "Add more sections or click 'Save Measurement' to complete"}
              {isDrawing && "Click on roof corners to draw the outline. Double-click or click first point to complete"}
            </p>
          </div>
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

export default GoogleMeasurementTool;
