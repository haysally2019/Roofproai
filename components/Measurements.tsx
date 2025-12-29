import React, { useState, useRef, useEffect } from 'react';
import { Ruler, Plus, Search, Save, Trash2, MapPin, Square, Download, X, Edit, Check, Layers, AlertCircle } from 'lucide-react';
import { RoofMeasurement, MeasurementSegment } from '../types';
import { useStore } from '../lib/store';

interface MeasurementsProps {}

declare global {
  interface Window {
    Microsoft: any;
  }
}

const Measurements: React.FC<MeasurementsProps> = () => {
  const { measurements, addMeasurement, updateMeasurement, deleteMeasurement } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMeasurement, setShowNewMeasurement] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedMeasurement, setSelectedMeasurement] = useState<RoofMeasurement | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'measure'>('list');

  const [imagerySource, setImagerySource] = useState<'Vexcel' | 'Bing' | 'Google' | 'Nearmap'>('Bing');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<{ lat: number; lng: number }[]>([]);
  const [segments, setSegments] = useState<MeasurementSegment[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 32.7767, lng: -96.7970 });
  const [bingMap, setBingMap] = useState<any>(null);
  const [bingMapLoaded, setBingMapLoaded] = useState(false);
  const [drawingLayer, setDrawingLayer] = useState<any>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const bingApiKey = import.meta.env.VITE_BING_MAPS_API_KEY;

  useEffect(() => {
    if (!bingApiKey || bingApiKey === 'YOUR_BING_MAPS_KEY_HERE') {
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.bing.com/api/maps/mapcontrol?key=${bingApiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setBingMapLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [bingApiKey]);

  useEffect(() => {
    if (!bingMapLoaded || !mapRef.current || !window.Microsoft || viewMode !== 'measure') return;

    if (bingMap) return;

    const map = new window.Microsoft.Maps.Map(mapRef.current, {
      center: new window.Microsoft.Maps.Location(mapCenter.lat, mapCenter.lng),
      zoom: 20,
      mapTypeId: window.Microsoft.Maps.MapTypeId.aerial,
      showDashboard: false,
      showZoomButtons: true,
      showMapTypeSelector: false,
      showScalebar: true,
      disableStreetside: true,
      enableClickableLogo: false,
      navigationBarMode: window.Microsoft.Maps.NavigationBarMode.minified
    });

    setBingMap(map);

    const layer = new window.Microsoft.Maps.Layer();
    map.layers.insert(layer);
    setDrawingLayer(layer);

    window.Microsoft.Maps.Events.addHandler(map, 'click', (e: any) => {
      if (!isDrawingMode) return;

      const point = new window.Microsoft.Maps.Point(e.getX(), e.getY());
      const loc = e.target.tryPixelToLocation(point);

      if (loc) {
        setCurrentSegment(prev => [...prev, { lat: loc.latitude, lng: loc.longitude }]);
      }
    });

  }, [bingMapLoaded, mapRef.current, viewMode]);

  useEffect(() => {
    if (!bingMap || !drawingLayer || !window.Microsoft) return;

    drawingLayer.clear();

    segments.forEach((segment) => {
      if (segment.geometry.length < 3) return;

      const locations = segment.geometry.map(
        point => new window.Microsoft.Maps.Location(point.lat, point.lng)
      );

      const polygon = new window.Microsoft.Maps.Polygon(locations, {
        fillColor: 'rgba(59, 130, 246, 0.3)',
        strokeColor: 'rgba(59, 130, 246, 0.8)',
        strokeThickness: 2
      });

      drawingLayer.add(polygon);

      const centerLat = segment.geometry.reduce((sum, p) => sum + p.lat, 0) / segment.geometry.length;
      const centerLng = segment.geometry.reduce((sum, p) => sum + p.lng, 0) / segment.geometry.length;

      const pushpin = new window.Microsoft.Maps.Pushpin(
        new window.Microsoft.Maps.Location(centerLat, centerLng),
        {
          text: `${segment.areaSqft.toFixed(0)} ft²`,
          color: 'rgba(59, 130, 246, 0.9)',
          title: segment.name
        }
      );

      drawingLayer.add(pushpin);
    });

    if (currentSegment.length > 0) {
      const locations = currentSegment.map(
        point => new window.Microsoft.Maps.Location(point.lat, point.lng)
      );

      locations.forEach(loc => {
        const pushpin = new window.Microsoft.Maps.Pushpin(loc, {
          color: 'rgba(16, 185, 129, 1)'
        });
        drawingLayer.add(pushpin);
      });

      if (locations.length > 1) {
        const polyline = new window.Microsoft.Maps.Polyline(locations, {
          strokeColor: 'rgba(16, 185, 129, 0.8)',
          strokeThickness: 2
        });
        drawingLayer.add(polyline);
      }
    }

  }, [segments, currentSegment, bingMap, drawingLayer]);

  const handleAddressSearch = async () => {
    if (!address.trim()) return;

    setIsGeocoding(true);

    try {
      const response = await fetch(
        `https://dev.virtualearth.net/REST/v1/Locations?query=${encodeURIComponent(address)}&key=${bingApiKey}`
      );
      const data = await response.json();

      if (data.resourceSets?.[0]?.resources?.length > 0) {
        const location = data.resourceSets[0].resources[0].point.coordinates;
        setMapCenter({ lat: location[0], lng: location[1] });
        setViewMode('measure');

        setTimeout(() => {
          if (bingMap) {
            bingMap.setView({
              center: new window.Microsoft.Maps.Location(location[0], location[1]),
              zoom: 20
            });
          }
        }, 100);
      } else {
        alert('Address not found. Please try a different address.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Error finding address. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const finishSegment = () => {
    if (currentSegment.length < 3) {
      alert('A roof segment needs at least 3 points');
      return;
    }

    const area = calculatePolygonArea(currentSegment);

    const newSegment: MeasurementSegment = {
      id: crypto.randomUUID(),
      measurementId: selectedMeasurement?.id || '',
      name: `Segment ${segments.length + 1}`,
      areaSqft: area,
      geometry: currentSegment,
      displayOrder: segments.length,
      materialType: 'Shingle',
      condition: 'Good'
    };

    setSegments([...segments, newSegment]);
    setCurrentSegment([]);
    setIsDrawingMode(false);
  };

  const calculatePolygonArea = (points: { lat: number; lng: number }[]): number => {
    if (points.length < 3) return 0;

    const R = 6371000;
    let area = 0;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];

      const lat1 = p1.lat * Math.PI / 180;
      const lat2 = p2.lat * Math.PI / 180;
      const lng1 = p1.lng * Math.PI / 180;
      const lng2 = p2.lng * Math.PI / 180;

      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    area = Math.abs(area * R * R / 2);
    const sqft = area * 10.7639;
    return Math.round(sqft * 100) / 100;
  };

  const calculateTotalArea = () => {
    return segments.reduce((sum, seg) => sum + seg.areaSqft, 0);
  };

  const saveMeasurement = () => {
    const totalArea = calculateTotalArea();

    const measurement: RoofMeasurement = {
      id: selectedMeasurement?.id || crypto.randomUUID(),
      companyId: '',
      address,
      latitude: mapCenter.lat,
      longitude: mapCenter.lng,
      imagerySource,
      totalAreaSqft: totalArea,
      segments,
      ridgeLength: 0,
      hipLength: 0,
      valleyLength: 0,
      rakeLength: 0,
      eaveLength: 0,
      perimeter: 0,
      wasteFactor: 10,
      measurementDate: new Date().toISOString(),
      status: 'Draft'
    };

    if (selectedMeasurement) {
      updateMeasurement(measurement);
    } else {
      addMeasurement(measurement);
    }

    setViewMode('list');
    setSegments([]);
    setAddress('');
    setBingMap(null);
  };

  const deleteSegment = (segmentId: string) => {
    setSegments(segments.filter(s => s.id !== segmentId));
  };

  const filteredMeasurements = measurements.filter(m =>
    m.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasValidApiKey = bingApiKey && bingApiKey !== 'YOUR_BING_MAPS_KEY_HERE';

  if (viewMode === 'measure') {
    if (!hasValidApiKey) {
      return (
        <div className="h-full flex items-center justify-center bg-slate-50">
          <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-200">
            <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Bing Maps API Key Required</h2>
            <p className="text-slate-600 mb-4">
              To use satellite imagery measurements, you need to add a Bing Maps API key to your environment variables.
            </p>
            <div className="text-left bg-slate-50 p-4 rounded-lg text-sm space-y-2">
              <p className="font-semibold text-slate-900">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>Get a key from Bing Maps Dev Center</li>
                <li>Add to .env: VITE_BING_MAPS_API_KEY</li>
                <li>Restart the dev server</li>
              </ol>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to List
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode('list');
                setSegments([]);
                setCurrentSegment([]);
                setIsDrawingMode(false);
                setBingMap(null);
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{address}</h2>
              <p className="text-sm text-slate-600">
                {segments.length} segments • {calculateTotalArea().toFixed(0)} sq ft total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isDrawingMode ? (
              <button
                onClick={() => setIsDrawingMode(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Square size={20} />
                Draw Segment
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={finishSegment}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  disabled={currentSegment.length < 3}
                >
                  <Check size={20} />
                  Finish ({currentSegment.length} points)
                </button>
                <button
                  onClick={() => {
                    setCurrentSegment([]);
                    setIsDrawingMode(false);
                  }}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={saveMeasurement}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              disabled={segments.length === 0}
            >
              <Save size={20} />
              Save Measurement
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 relative">
            <div
              ref={mapRef}
              className="w-full h-full"
              style={{ minHeight: '600px' }}
            />
            {isDrawingMode && (
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                <p className="font-semibold">Drawing Mode Active</p>
                <p className="text-sm">Click on the map to add points to your roof segment</p>
              </div>
            )}
          </div>

          <div className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers size={20} />
              Roof Segments
            </h3>

            {isDrawingMode && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-1">Drawing Mode</p>
                <p className="text-xs text-blue-700">
                  Click on the satellite image to add points.
                  <br />
                  Current points: {currentSegment.length} (need 3 minimum)
                </p>
              </div>
            )}

            {segments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Square size={48} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No segments yet</p>
                <p className="text-xs mt-1">Click "Draw Segment" to start</p>
              </div>
            ) : (
              <div className="space-y-2">
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">{segment.name}</p>
                        <p className="text-sm text-slate-600">{segment.areaSqft.toFixed(0)} sq ft</p>
                      </div>
                      <button
                        onClick={() => deleteSegment(segment.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Material: {segment.materialType || 'Shingle'}</p>
                      <p>Condition: {segment.condition || 'Good'}</p>
                      <p>Points: {segment.geometry.length}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-2">Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Area:</span>
                  <span className="font-semibold">{calculateTotalArea().toFixed(0)} sq ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Segments:</span>
                  <span className="font-semibold">{segments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Waste Factor:</span>
                  <span className="font-semibold">10%</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-900 font-semibold">Total with Waste:</span>
                  <span className="font-bold text-blue-600">
                    {(calculateTotalArea() * 1.1).toFixed(0)} sq ft
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Ruler className="text-blue-600" />
            Roof Measurements
          </h1>
          <p className="text-slate-500 mt-1">DIY satellite measurements with Bing imagery</p>
        </div>
        <button
          onClick={() => setShowNewMeasurement(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={20} />
          New Measurement
        </button>
      </div>

      {!hasValidApiKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-yellow-900">Bing Maps API Key Not Configured</p>
            <p className="text-sm text-yellow-700 mt-1">
              Add your Bing Maps API key to the .env file as VITE_BING_MAPS_API_KEY to enable satellite imagery measurements.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Total Measurements</p>
          <p className="text-2xl font-bold text-slate-900">{measurements.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Total Area Measured</p>
          <p className="text-2xl font-bold text-blue-600">
            {measurements.reduce((sum, m) => sum + m.totalAreaSqft, 0).toFixed(0)} sq ft
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">
            {measurements.filter(m => m.status === 'Completed').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Draft</p>
          <p className="text-2xl font-bold text-yellow-600">
            {measurements.filter(m => m.status === 'Draft').length}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search measurements by address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredMeasurements.length === 0 ? (
          <div className="text-center py-16">
            <Ruler size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Measurements Yet</h3>
            <p className="text-slate-600 mb-6">Start measuring roofs using satellite imagery</p>
            <button
              onClick={() => setShowNewMeasurement(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              disabled={!hasValidApiKey}
            >
              <Plus size={20} />
              Create First Measurement
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Address</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Total Area</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Segments</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeasurements.map((measurement) => (
                  <tr key={measurement.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{measurement.address}</p>
                      <p className="text-sm text-slate-500">{measurement.imagerySource} imagery</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{measurement.totalAreaSqft.toFixed(0)} sq ft</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-600">{measurement.segments.length} segments</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        measurement.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        measurement.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {measurement.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600">
                        {new Date(measurement.measurementDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedMeasurement(measurement);
                            setAddress(measurement.address);
                            setMapCenter({
                              lat: measurement.latitude || 0,
                              lng: measurement.longitude || 0
                            });
                            setSegments(measurement.segments);
                            setViewMode('measure');
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                          disabled={!hasValidApiKey}
                        >
                          <Edit size={18} className="text-slate-600" />
                        </button>
                        <button
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download Report"
                        >
                          <Download size={18} className="text-slate-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this measurement?')) {
                              deleteMeasurement(measurement.id);
                            }
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewMeasurement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">New Measurement</h2>
              <button onClick={() => setShowNewMeasurement(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Property Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Dallas, TX 75201"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGeocoding}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold mb-1">How it works:</p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Enter the property address</li>
                  <li>Click to view Bing satellite imagery</li>
                  <li>Draw segments around each roof section</li>
                  <li>Areas are automatically calculated</li>
                  <li>Save and export your measurements</li>
                </ol>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowNewMeasurement(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={isGeocoding}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNewMeasurement(false);
                  handleAddressSearch();
                }}
                disabled={!address.trim() || !hasValidApiKey || isGeocoding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeocoding ? (
                  <>Loading...</>
                ) : (
                  <>
                    <MapPin size={20} />
                    Load Imagery
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Measurements;
