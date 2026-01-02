import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Check, X, CreditCard, AlertCircle, ChevronRight, Undo2, RotateCcw, Save, PenTool } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CreditPurchaseModal from './CreditPurchaseModal';
import * as atlas from 'azure-maps-control';
import * as drawing from 'azure-maps-drawing-tools';
import 'azure-maps-control/dist/atlas.min.css';
import 'azure-maps-drawing-tools/dist/atlas-drawing.min.css';

interface MeasurementToolProps {
  address: string;
  mapProvider: 'satellite' | 'satellite_road_labels';
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

const MeasurementTool: React.FC<MeasurementToolProps> = ({ address, mapProvider, onSave, onCancel }) => {
  const [step, setStep] = useState<'instructions' | 'measuring'>('instructions');
  const [polygons, setPolygons] = useState<atlas.Shape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [drawingManager, setDrawingManager] = useState<drawing.drawing.DrawingManager | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalArea, setTotalArea] = useState<number>(0);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
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

  const cleanupMap = () => {
    if (drawingManager) {
      try {
        drawingManager.dispose();
      } catch (error) {
        console.error('Error disposing drawing manager:', error);
      }
    }
    if (map) {
      try {
        map.dispose();
      } catch (error) {
        console.error('Error disposing map:', error);
      }
      setMap(null);
      setDrawingManager(null);
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
        const manager = new drawing.drawing.DrawingManager(newMap, {
          toolbar: new drawing.control.DrawingToolbar({
            buttons: ['draw-polygon'],
            position: atlas.ControlPosition.TopRight,
            style: 'light',
            visible: false
          })
        });

        newMap.events.add('drawingcomplete', manager, (shape: atlas.Shape) => {
          if (shape.getType() === 'Polygon') {
            const coords = shape.getCoordinates() as atlas.data.Position[][];
            if (coords && coords.length > 0) {
              const area = calculatePolygonArea(coords[0]);
              setTotalArea(prev => prev + area);
              setPolygons(prev => [...prev, shape]);
              manager.setOptions({ mode: drawing.drawing.DrawingMode.idle });
              setIsDrawing(false);
            }
          }
        });

        setDrawingManager(manager);
        setMapLoading(false);
      });

      setMap(newMap);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to load map');
      setMapLoading(false);
    }
  };

  const calculatePolygonArea = (positions: atlas.data.Position[]): number => {
    if (positions.length < 3) return 0;

    let areaMeters = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      const p1 = positions[i];
      const p2 = positions[i + 1];
      areaMeters += (p2[0] - p1[0]) * (p2[1] + p1[1]);
    }

    areaMeters = Math.abs(areaMeters / 2.0);

    const R = 6371000;
    const avgLat = positions.reduce((sum, p) => sum + p[1], 0) / positions.length;
    const latRadians = (avgLat * Math.PI) / 180;

    const metersPerDegreeLon = R * Math.cos(latRadians) * (Math.PI / 180);
    const metersPerDegreeLat = R * (Math.PI / 180);

    areaMeters = areaMeters * metersPerDegreeLon * metersPerDegreeLat;

    const areaFeet = areaMeters * 10.7639;
    return Math.round(areaFeet);
  };

  const handleStartDrawing = () => {
    if (drawingManager) {
      drawingManager.setOptions({ mode: drawing.drawing.DrawingMode.drawPolygon });
      setIsDrawing(true);
    }
  };

  const handleCancelDrawing = () => {
    if (drawingManager) {
      drawingManager.setOptions({ mode: drawing.drawing.DrawingMode.idle });
      setIsDrawing(false);
    }
  };

  const handleUndo = () => {
    if (polygons.length === 0 || !drawingManager) return;

    const lastPolygon = polygons[polygons.length - 1];
    const coords = lastPolygon.getCoordinates() as atlas.data.Position[][];

    if (coords && coords.length > 0) {
      const area = calculatePolygonArea(coords[0]);
      setTotalArea(prev => Math.max(0, prev - area));
    }

    drawingManager.getSource().remove(lastPolygon);
    setPolygons(prev => prev.slice(0, -1));
  };

  const handleReset = () => {
    if (!drawingManager) return;

    polygons.forEach(poly => {
      drawingManager.getSource().remove(poly);
    });

    setPolygons([]);
    setTotalArea(0);
    setIsDrawing(false);
    drawingManager.setOptions({ mode: drawing.drawing.DrawingMode.idle });
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
        const coords = poly.getCoordinates() as atlas.data.Position[][];
        const positions = coords && coords.length > 0 ? coords[0] : [];

        const geometry = positions.map(pos => ({ lon: pos[0], lat: pos[1] }));
        const area = calculatePolygonArea(positions);

        return {
          type: 'roof_section',
          geometry: geometry,
          area: area,
          label: polygons.length > 1 ? `Section ${index + 1}` : 'Main Roof'
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
                    Click on each corner of the roof section. Double-click the last point to complete the shape.
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
                    <li>• Zoom to maximum level for best accuracy</li>
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
