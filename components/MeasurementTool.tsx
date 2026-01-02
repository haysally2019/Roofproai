import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Check, X, CreditCard, AlertCircle, Map as MapIcon, Save } from 'lucide-react';
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
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

const MeasurementTool: React.FC<MeasurementToolProps> = ({ address, onSave, onCancel }) => {
  const [points, setPoints] = useState<Point[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [dataSource, setDataSource] = useState<atlas.source.DataSource | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [mapProvider, setMapProvider] = useState<'bing' | 'google'>('bing');
  const [saving, setSaving] = useState(false);
  const [area, setArea] = useState<number>(0);

  const mapRef = useRef<HTMLDivElement>(null);
  const azureApiKey = import.meta.env.VITE_AZURE_MAPS_KEY;

  useEffect(() => {
    loadCredits();
  }, []);

  useEffect(() => {
    if (mapRef.current && azureApiKey) {
      initializeMap();
    }
    return () => {
      if (map) {
        map.dispose();
      }
    };
  }, [mapProvider]);

  useEffect(() => {
    if (points.length >= 3) {
      calculateArea();
    }
  }, [points]);

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
    if (!mapRef.current) return;

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
        style: mapProvider === 'bing' ? 'satellite' : 'satellite_road_labels'
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
      });

      setMap(newMap);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const geocodeAddress = async (addr: string): Promise<atlas.data.Position> => {
    try {
      const response = await fetch(
        `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureApiKey}&query=${encodeURIComponent(addr)}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const pos = data.results[0].position;
        return [pos.lon, pos.lat];
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return [-96.7970, 32.7767];
  };

  const handleMapClick = (e: any) => {
    if (!e.position || isConnected) return;

    const newPoint: Point = {
      position: e.position,
      id: `point-${Date.now()}`
    };

    setPoints(prev => [...prev, newPoint]);
    updateMapFeatures([...points, newPoint], false);
  };

  const calculateDistance = (pos1: atlas.data.Position, pos2: atlas.data.Position): number => {
    const R = 20902231;
    const lat1 = pos1[1] * Math.PI / 180;
    const lat2 = pos2[1] * Math.PI / 180;
    const dLat = (pos2[1] - pos1[1]) * Math.PI / 180;
    const dLon = (pos2[0] - pos1[0]) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const calculateArea = () => {
    if (points.length < 3) {
      setArea(0);
      return;
    }

    let totalArea = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const xi = points[i].position[0];
      const yi = points[i].position[1];
      const xj = points[j].position[0];
      const yj = points[j].position[1];
      totalArea += (xi * yj) - (xj * yi);
    }

    const areaInSqDegrees = Math.abs(totalArea / 2);
    const R = 20902231;
    const areaInSqFeet = areaInSqDegrees * R * R * Math.cos(points[0].position[1] * Math.PI / 180);

    setArea(Math.round(areaInSqFeet));
  };

  const updateMapFeatures = (pts: Point[], connected: boolean) => {
    if (!dataSource) return;

    dataSource.clear();

    pts.forEach(point => {
      dataSource.add(new atlas.data.Feature(new atlas.data.Point(point.position)));
    });

    if (pts.length >= 2) {
      const coordinates = pts.map(p => p.position);
      if (connected && pts.length >= 3) {
        coordinates.push(pts[0].position);
        dataSource.add(new atlas.data.Feature(new atlas.data.Polygon([coordinates])));
      } else {
        dataSource.add(new atlas.data.Feature(new atlas.data.LineString(coordinates)));
      }
    }
  };

  const handleConnectPoints = () => {
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

      const { data: deductionResult, error: deductionError } = await supabase
        .rpc('deduct_measurement_credit', {
          p_company_id: userData.company_id,
          p_user_id: user.id,
          p_measurement_id: measurement.id
        });

      if (deductionError || !deductionResult) {
        await supabase.from('roof_measurements').delete().eq('id', measurement.id);
        throw new Error('Failed to deduct credit');
      }

      onSave(measurement);
    } catch (error: any) {
      console.error('Error saving measurement:', error);
      alert(error.message || 'Failed to save measurement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">DIY Roof Measurement</h3>
              <p className="text-blue-100 text-sm">{address}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2 text-white">
                  <CreditCard size={18} />
                  <span className="font-bold">{credits}</span>
                  <span className="text-sm">credits</span>
                </div>
              </div>
              {credits < 1 && (
                <button
                  onClick={() => setShowCreditModal(true)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-sm"
                >
                  Buy Credits
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex bg-white border-2 border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setMapProvider('bing')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    mapProvider === 'bing'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <MapIcon size={16} className="inline mr-2" />
                  Bing Maps
                </button>
                <button
                  onClick={() => setMapProvider('google')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    mapProvider === 'google'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <MapIcon size={16} className="inline mr-2" />
                  Google Maps
                </button>
              </div>

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
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={points.length === 0}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Undo
              </button>
              <button
                onClick={handleReset}
                disabled={points.length === 0}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <X size={18} className="inline mr-1" />
                Reset
              </button>
            </div>
          </div>

          <div className="mt-3 bg-blue-50 border-l-4 border-blue-600 p-3 rounded-r">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="text-blue-900">
                {!isConnected ? (
                  <span><strong>Click on the map</strong> to mark corner points of the roof section. Add at least 3 points, then click "Connect Points".</span>
                ) : (
                  <span><strong>Polygon complete!</strong> Review the measurement and click "Save" to finalize. This will use 1 credit.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0" />

          {points.length >= 3 && !isConnected && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
              <button
                onClick={handleConnectPoints}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl font-bold flex items-center gap-2"
              >
                <Check size={20} />
                Connect Points & Calculate Area
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isConnected || saving || credits < 1}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {saving ? 'Saving...' : `Save Measurement (${credits} credit${credits !== 1 ? 's' : ''} available)`}
            </button>
          </div>
        </div>
      </div>

      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onPurchaseComplete={loadCredits}
        currentCredits={credits}
      />
    </>
  );
};

export default MeasurementTool;
