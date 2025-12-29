import React, { useState, useRef, useEffect } from 'react';
import { Ruler, Plus, Search, Save, Trash2, MapPin, Square, Satellite, Download, Eye, X, Edit, Check, Layers } from 'lucide-react';
import { RoofMeasurement, MeasurementSegment } from '../types';
import { useStore } from '../lib/store';

interface MeasurementsProps {}

const Measurements: React.FC<MeasurementsProps> = () => {
  const { leads, measurements, addMeasurement, updateMeasurement, deleteMeasurement } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMeasurement, setShowNewMeasurement] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedMeasurement, setSelectedMeasurement] = useState<RoofMeasurement | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'measure'>('list');

  const [imagerySource, setImagerySource] = useState<'Vexcel' | 'Bing' | 'Google' | 'Nearmap'>('Bing');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<{ lat: number; lng: number }[]>([]);
  const [segments, setSegments] = useState<MeasurementSegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<MeasurementSegment | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 32.7767, lng: -96.7970 });
  const [zoom, setZoom] = useState(20);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddressSearch = () => {
    if (!address.trim()) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setMapCenter({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          });
          setViewMode('measure');
          loadSatelliteImagery();
        } else {
          alert('Address not found. Please try a different address.');
        }
      })
      .catch(err => {
        console.error('Geocoding error:', err);
        alert('Error finding address. Please try again.');
      });
  };

  const loadSatelliteImagery = () => {
    setImageLoaded(true);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lat = mapCenter.lat + ((canvas.height / 2 - y) / canvas.height) * 0.001;
    const lng = mapCenter.lng + ((x - canvas.width / 2) / canvas.width) * 0.001;

    setCurrentSegment([...currentSegment, { lat, lng }]);
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

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].lng * points[j].lat;
      area -= points[j].lng * points[i].lat;
    }
    area = Math.abs(area / 2);

    const sqft = area * 364000 * 364000;
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
  };

  const deleteSegment = (segmentId: string) => {
    setSegments(segments.filter(s => s.id !== segmentId));
  };

  useEffect(() => {
    if (!canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#334155';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${imagerySource} Satellite Imagery`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`${address}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Draw segments by clicking points on the roof', canvas.width / 2, canvas.height / 2 + 40);

    segments.forEach((segment, idx) => {
      if (segment.geometry.length === 0) return;

      ctx.beginPath();
      ctx.fillStyle = `rgba(59, 130, 246, 0.3)`;
      ctx.strokeStyle = `rgba(59, 130, 246, 0.8)`;
      ctx.lineWidth = 2;

      segment.geometry.forEach((point, i) => {
        const x = canvas.width / 2 + ((point.lng - mapCenter.lng) / 0.001) * canvas.width;
        const y = canvas.height / 2 - ((point.lat - mapCenter.lat) / 0.001) * canvas.height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const centerX = segment.geometry.reduce((sum, p) => sum + p.lng, 0) / segment.geometry.length;
      const centerY = segment.geometry.reduce((sum, p) => sum + p.lat, 0) / segment.geometry.length;
      const labelX = canvas.width / 2 + ((centerX - mapCenter.lng) / 0.001) * canvas.width;
      const labelY = canvas.height / 2 - ((centerY - mapCenter.lat) / 0.001) * canvas.height;

      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${segment.name}`, labelX, labelY - 5);
      ctx.font = '11px Arial';
      ctx.fillText(`${segment.areaSqft.toFixed(0)} sq ft`, labelX, labelY + 10);
    });

    if (currentSegment.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = 2;

      currentSegment.forEach((point, i) => {
        const x = canvas.width / 2 + ((point.lng - mapCenter.lng) / 0.001) * canvas.width;
        const y = canvas.height / 2 - ((point.lat - mapCenter.lat) / 0.001) * canvas.height;

        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(16, 185, 129, 1)';
        ctx.fill();

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }
  }, [segments, currentSegment, imageLoaded, address, imagerySource, mapCenter]);

  const filteredMeasurements = measurements.filter(m =>
    m.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewMode === 'measure') {
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
            <select
              value={imagerySource}
              onChange={(e) => setImagerySource(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="Bing">Bing Maps</option>
              <option value="Vexcel">Vexcel</option>
              <option value="Google">Google</option>
              <option value="Nearmap">Nearmap</option>
            </select>

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
                >
                  <Check size={20} />
                  Finish Segment
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
          <div className="flex-1 p-4 bg-slate-100">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full">
              <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                onClick={handleCanvasClick}
                className="w-full h-full cursor-crosshair"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              />
            </div>
          </div>

          <div className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers size={20} />
              Roof Segments
            </h3>

            {isDrawingMode && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-1">Drawing Mode Active</p>
                <p className="text-xs text-blue-700">
                  Click on the map to add points. Need at least 3 points.
                  <br />
                  Current points: {currentSegment.length}
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
          <p className="text-slate-500 mt-1">DIY satellite measurements with Vexcel and Bing imagery</p>
        </div>
        <button
          onClick={() => setShowNewMeasurement(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={20} />
          New Measurement
        </button>
      </div>

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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Imagery Source
                </label>
                <select
                  value={imagerySource}
                  onChange={(e) => setImagerySource(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Bing">Bing Maps</option>
                  <option value="Vexcel">Vexcel</option>
                  <option value="Google">Google</option>
                  <option value="Nearmap">Nearmap</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold mb-1">How it works:</p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Enter the property address</li>
                  <li>Select your preferred satellite imagery provider</li>
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
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNewMeasurement(false);
                  handleAddressSearch();
                }}
                disabled={!address.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MapPin size={20} />
                Load Imagery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Measurements;
