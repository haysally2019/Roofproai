import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Check, X, CreditCard, AlertCircle, ChevronRight, Undo2, RotateCcw, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CreditPurchaseModal from './CreditPurchaseModal';
import * as atlas from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.min.css';

interface Point {
  position: atlas.data.Position;
  id: string;
}

interface MeasurementToolProps {
  address: string;
  mapProvider: 'satellite' | 'satellite_road_labels';
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

const MeasurementTool: React.FC<MeasurementToolProps> = ({ address, mapProvider, onSave, onCancel }) => {
  const [step, setStep] = useState<'instructions' | 'measuring'>('instructions');
  const [points, setPoints] = useState<Point[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [dataSource, setDataSource] = useState<atlas.source.DataSource | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [area, setArea] = useState<number>(0);
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

  useEffect(() => {
    if (points.length >= 3) {
      calculateArea();
    }
  }, [points]);

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

        setMapLoading(false);
      });

      setMap(newMap);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to load map');
      setMapLoading(false);
    }
  };

  const handleMapClick = (e: atlas.MapMouseEvent) => {
    if (isConnected) return;

    const position = e.position;
    if (!position) return;

    const newPoint: Point = {
      position: [position[0], position[1]],
      id: `point-${Date.now()}`
    };

    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    updateMapFeatures(newPoints, false);
  };

  const updateMapFeatures = (currentPoints: Point[], connected: boolean) => {
    if (!dataSource) return;

    dataSource.clear();

    const positions = currentPoints.map(p => p.position);

    currentPoints.forEach(point => {
      dataSource.add(new atlas.data.Feature(new atlas.data.Point(point.position)));
    });

    if (positions.length > 1) {
      const lineString = new atlas.data.LineString(positions);
      dataSource.add(new atlas.data.Feature(lineString));
    }

    if (connected && positions.length >= 3) {
      const closedPositions = [...positions, positions[0]];
      const polygon = new atlas.data.Polygon([closedPositions]);
      dataSource.add(new atlas.data.Feature(polygon));
    }
  };

  const calculateArea = () => {
    if (points.length < 3) return;

    const positions = points.map(p => p.position);
    const closedPositions = [...positions, positions[0]];

    let areaMeters = 0;
    for (let i = 0; i < closedPositions.length - 1; i++) {
      const p1 = closedPositions[i];
      const p2 = closedPositions[i + 1];
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
    setArea(Math.round(areaFeet));
  };

  const handleConnect = () => {
    if (points.length < 3) {
      alert('You need at least 3 points to create a roof section');
      return;
    }
    setIsConnected(true);
    updateMapFeatures(points, true);
  };

  const handleUndo = () => {
    if (points.length === 0) return;

    const newPoints = points.slice(0, -1);
    setPoints(newPoints);
    setIsConnected(false);
    updateMapFeatures(newPoints, false);
  };

  const handleReset = () => {
    setPoints([]);
    setIsConnected(false);
    setArea(0);
    if (dataSource) {
      dataSource.clear();
    }
  };

  const handleSave = async () => {
    if (!isConnected || points.length < 3) {
      alert('Please connect all points to create a complete roof section');
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

      const measurementData = {
        company_id: userData.company_id,
        address: address,
        total_area: area,
        segments: [{
          type: 'roof_section',
          geometry: points.map(p => ({ lon: p.position[0], lat: p.position[1] })),
          area: area,
          label: 'Main Roof'
        }],
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
                  <h3 className="font-bold text-slate-900 mb-1">Click Corner Points</h3>
                  <p className="text-slate-600 text-sm">
                    Click on each corner of the roof to place measurement points. Start at one corner and work around the perimeter.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Connect the Shape</h3>
                  <p className="text-slate-600 text-sm">
                    After placing at least 3 points, click "Connect Points" to close the shape and calculate the area.
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
                  <h4 className="font-bold text-amber-900 mb-1">Tips for Best Results</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Use maximum zoom for precise point placement</li>
                    <li>• Place points at exact corners of the roof structure</li>
                    <li>• Use the Undo button to remove the last point if needed</li>
                    <li>• For complex roofs, measure each section separately</li>
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
              <p className="text-sm text-slate-500">Click on the map to place measurement points</p>
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
                <span className="text-sm text-slate-600">Points: </span>
                <span className="font-bold text-slate-900">{points.length}</span>
              </div>

              {area > 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-emerald-700">Area: </span>
                  <span className="font-bold text-emerald-900">{area.toLocaleString()} sq ft</span>
                </div>
              )}

              {isConnected && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
                  <Check size={16} className="text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Shape Connected</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={points.length === 0}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Undo2 size={18} />
                Undo
              </button>

              <button
                onClick={handleReset}
                disabled={points.length === 0}
                className="px-4 py-2 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCcw size={18} />
                Reset
              </button>

              {!isConnected && (
                <button
                  onClick={handleConnect}
                  disabled={points.length < 3}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check size={18} />
                  Connect Points
                </button>
              )}

              {isConnected && (
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
