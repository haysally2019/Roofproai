import React, { useState, useEffect, useRef } from 'react';
import { EstimateItem, Lead, Estimate, EstimateTier } from '../types';
import { 
  Sparkles, Save, Calculator, RotateCcw,
  PenTool, Satellite, FileText, Truck, AlertTriangle, Scan, Crosshair, 
  Layers, MousePointer2, Eye, EyeOff, Image as ImageIcon
} from 'lucide-react';
import { useStore } from '../lib/store';
import MaterialOrderModal from './MaterialOrderModal';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface EstimatorProps {
  leads: Lead[];
  onSaveEstimate: (leadId: string, estimate: Estimate) => void;
}

// Helper to calculate area multiplier based on pitch (rise over 12)
const getPitchFactor = (rise: number) => Math.sqrt(1 + Math.pow(rise / 12, 2));

interface RoofPolygon {
  overlay: any; // Google Maps Polygon object
  pitch: number;
  areaSqFt: number;
}

const Estimator: React.FC<EstimatorProps> = ({ leads, onSaveEstimate }) => {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'calculator' | 'map'>('map');
  const [viewMode, setViewMode] = useState<'proposal' | 'materials'>('proposal');
  
  // --- ESTIMATE DATA ---
  const [totalSurfaceArea, setTotalSurfaceArea] = useState<number>(0);
  const [globalPitch, setGlobalPitch] = useState<number>(6); 
  const [wasteFactor, setWasteFactor] = useState<number>(10);
  const [selectedTier, setSelectedTier] = useState<EstimateTier>('Better');
  
  // "surface" = API provided 3D area. "flat" = Manual 2D draw (needs pitch adjustment)
  const [measurementSource, setMeasurementSource] = useState<'api' | 'manual'>('manual'); 
  
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [materialList, setMaterialList] = useState<EstimateItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [estimateName, setEstimateName] = useState<string>("Roof Replacement Proposal");

  // --- MAPS STATE ---
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [drawingManager, setDrawingManager] = useState<any>(null);
  
  // Enhanced Polygon State
  const [polygons, setPolygons] = useState<RoofPolygon[]>([]);
  const [selectedPolyIndex, setSelectedPolyIndex] = useState<number | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [staticImageUrl, setStaticImageUrl] = useState<string | null>(null);
  
  // Track map center
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Signature
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // --- 1. SCRIPT LOADER ---
  useEffect(() => {
    if (!apiKey) {
        setMapError("API Key is missing in .env file");
        return;
    }

    const scriptId = 'google-maps-script';
    const onScriptLoad = () => {
        if (!mapRef.current) return;
        try { initMap(); } catch (e) { setMapError("Failed to initialize map."); }
    };

    if (window.google && window.google.maps) {
        onScriptLoad();
        return;
    }

    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry,places`;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', onScriptLoad);
        document.head.appendChild(script);
    }
  }, [apiKey]);

  // --- 2. MAP INITIALIZATION ---
  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    try {
        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 39.8283, lng: -98.5795 },
            zoom: 4,
            mapTypeId: 'satellite',
            tilt: 0, 
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            rotateControl: false,
            zoomControl: true,
        });

        setMapInstance(map);

        map.addListener('idle', () => {
            const center = map.getCenter();
            if(center) setMapCenter({ lat: center.lat(), lng: center.lng() });
        });

        // Setup Drawing Manager
        const manager = new window.google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                fillColor: '#4f46e5',
                fillOpacity: 0.35,
                strokeWeight: 2,
                strokeColor: '#4f46e5',
                clickable: true,
                editable: true,
                draggable: false, 
                zIndex: 1,
            },
        });

        manager.setMap(map);
        setDrawingManager(manager);

        // --- POLYGON HANDLING ---
        window.google.maps.event.addListener(manager, 'overlaycomplete', (event: any) => {
            if (event.type === 'polygon') {
                const newPolyOverlay = event.overlay;
                
                // Calculate 2D area immediately
                const areaMeters = window.google.maps.geometry.spherical.computeArea(newPolyOverlay.getPath());
                const areaSqFt = Math.round(areaMeters * 10.7639);

                const newPolyData: RoofPolygon = {
                    overlay: newPolyOverlay,
                    pitch: globalPitch, // Inherit current global pitch default
                    areaSqFt: areaSqFt
                };

                // Add to state using functional update to ensure we have latest list
                setPolygons(prev => {
                    const updated = [...prev, newPolyData];
                    // Recalculate totals immediately
                    recalculateTotalArea(updated, 'manual');
                    return updated;
                });

                // Add click listener to select this polygon
                newPolyOverlay.addListener('click', () => {
                    // Find index in the *current* state (conceptually)
                    // We need to look it up in the array. 
                    // Since we can't easily access the state inside this closure without refs,
                    // we'll rely on the overlay object reference equality or tag it.
                    setPolygons(currentPolys => {
                        const idx = currentPolys.findIndex(p => p.overlay === newPolyOverlay);
                        if (idx !== -1) setSelectedPolyIndex(idx);
                        return currentPolys;
                    });
                });

                // Listen for shape edits to update area
                const path = newPolyOverlay.getPath();
                ['set_at', 'insert_at', 'remove_at'].forEach(evt => {
                    window.google.maps.event.addListener(path, evt, () => {
                        // Re-measure this specific polygon
                        const newAreaMeters = window.google.maps.geometry.spherical.computeArea(path);
                        const newAreaSqFt = Math.round(newAreaMeters * 10.7639);
                        
                        setPolygons(currentPolys => {
                            const updated = currentPolys.map(p => 
                                p.overlay === newPolyOverlay ? { ...p, areaSqFt: newAreaSqFt } : p
                            );
                            recalculateTotalArea(updated, 'manual');
                            return updated;
                        });
                    });
                });
                
                manager.setDrawingMode(null);
                setIsDrawing(false);
                setMeasurementSource('manual'); 
            }
        });

        // Search Box Init
        if (searchInputRef.current) {
            const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, { types: ['address'] });
            autocomplete.bindTo('bounds', map);
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.geometry?.location) return;

                if (place.geometry.viewport) map.fitBounds(place.geometry.viewport);
                else { map.setCenter(place.geometry.location); map.setZoom(20); }
                
                // Fetch Data & Static Image
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                fetchRoofData(lat, lng);
                setStaticImageUrl(`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=400x400&maptype=satellite&key=${apiKey}`);
            });
        }
    } catch (err) {
        setMapError("Map failed to load.");
    }
  };

  // Recalculates total surface area based on all polygons and their individual pitches
  const recalculateTotalArea = (currentPolys: RoofPolygon[], source: 'api' | 'manual') => {
      if (source === 'api') return; // API sets totalSurfaceArea directly
      
      let total = 0;
      currentPolys.forEach(p => {
          const multiplier = getPitchFactor(p.pitch);
          total += (p.areaSqFt * multiplier);
      });
      setTotalSurfaceArea(Math.round(total));
  };

  // Update a specific polygon's pitch
  const updatePolygonPitch = (index: number, newPitch: number) => {
      const updated = [...polygons];
      updated[index].pitch = newPitch;
      setPolygons(updated);
      recalculateTotalArea(updated, 'manual');
  };

  const deleteSelectedPolygon = () => {
      if (selectedPolyIndex === null) return;
      const polyToRemove = polygons[selectedPolyIndex];
      polyToRemove.overlay.setMap(null); // Remove from map
      
      const updated = polygons.filter((_, i) => i !== selectedPolyIndex);
      setPolygons(updated);
      setSelectedPolyIndex(null);
      recalculateTotalArea(updated, 'manual');
  };

  // --- 3. ROOF DATA LOOKUP (HYBRID MODE) ---
  const fetchRoofData = async (lat?: number, lng?: number) => {
      const targetLat = lat || mapCenter?.lat;
      const targetLng = lng || mapCenter?.lng;

      if (!targetLat || !targetLng || !apiKey) {
          if (!lat) addToast("Please center the map on a roof first.", "error");
          return;
      }

      setAnalyzing(true);
      try {
          const response = await fetch(
              `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${targetLat}&location.longitude=${targetLng}&requiredQuality=HIGH&key=${apiKey}`
          );

          if (!response.ok) {
              // *** CRITICAL IMPROVEMENT: Fallback to Manual Mode on 404 ***
              if (response.status === 404) {
                  addToast("Automated data unavailable for this rural location. Switching to Manual Trace tools.", "info");
                  
                  // Clear any existing 3D data
                  setMeasurementSource('manual');
                  setTotalSurfaceArea(0); 
                  
                  // Enable tools immediately
                  if (drawingManager) {
                      drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                      setIsDrawing(true);
                  }
                  
                  // Load static image helper
                  setStaticImageUrl(`https://maps.googleapis.com/maps/api/staticmap?center=${targetLat},${targetLng}&zoom=20&size=400x400&maptype=satellite&key=${apiKey}`);
                  
                  return; 
              }
              throw new Error("Solar API Error");
          }

          const data = await response.json();
          if (data.solarPotential?.wholeRoofStats) {
              const stats = data.solarPotential.wholeRoofStats;
              const areaSqFt = Math.round(stats.areaMeters2 * 10.7639);
              
              // Clear manual drawings
              polygons.forEach(p => p.overlay.setMap(null));
              setPolygons([]);
              setSelectedPolyIndex(null);

              setMeasurementSource('api');
              setTotalSurfaceArea(areaSqFt);
              
              // Estimate dominant pitch for the slider default
              if (data.solarPotential.roofSegmentStats?.[0]) {
                  const pitchDeg = data.solarPotential.roofSegmentStats[0].pitchDegrees;
                  const pitchRise = Math.round(12 * Math.tan(pitchDeg * (Math.PI / 180)));
                  setGlobalPitch(Math.min(12, Math.max(0, pitchRise)));
              }

              addToast(`3D Model Found: ${areaSqFt.toLocaleString()} sqft`, "success");
          } 
      } catch (error: any) {
          console.error(error);
          addToast("Could not retrieve 3D data. Please draw manually.", "error");
      } finally {
          setAnalyzing(false);
      }
  };

  const calculateEstimate = () => {
      if (totalSurfaceArea <= 0) {
          addToast("Total area is 0. Please draw roof facets.", "error");
          return;
      }

      const wasteMult = 1 + (wasteFactor / 100);
      const billableSqFt = totalSurfaceArea * wasteMult;
      const squares = Math.ceil(billableSqFt / 100);

      generateLineItems(billableSqFt, squares);
      setActiveTab('calculator');
      addToast(`Estimate ready: ${squares} Squares`, "success");
  };

  const generateLineItems = (sqFt: number, squares: number) => {
      let pricePerSq = 380; 
      let systemName = "3-Tab System";
      
      if (selectedTier === 'Better') { pricePerSq = 495; systemName = "Architectural System"; }
      if (selectedTier === 'Best') { pricePerSq = 675; systemName = "Class 4 Impact System"; }

      // Simple steep charge logic based on global pitch (or avg)
      if (globalPitch > 7) pricePerSq += 25;

      const proposalItems: EstimateItem[] = [
          { description: "Mobilization, Site Prep & Safety", quantity: 1, unit: 'LS', unitPrice: 450.00, total: 450.00 },
          { description: "Tear-off & Debris Disposal", quantity: squares, unit: 'SQ', unitPrice: 95.00, total: squares * 95.00 },
          { description: `Install ${systemName}`, quantity: squares, unit: 'SQ', unitPrice: (pricePerSq - 95), total: squares * (pricePerSq - 95) },
          { description: "Ice & Water Shield", quantity: Math.ceil(sqFt * 0.15), unit: 'SF', unitPrice: 2.50, total: Math.ceil(sqFt * 0.15) * 2.50 },
          { description: "Flashings & Vent Pkg", quantity: 1, unit: 'LS', unitPrice: 950.00, total: 950.00 },
      ];

      setItems(proposalItems);
      // Generate materials list (simplified)
      setMaterialList([
          { description: `${selectedTier} Shingles`, quantity: squares * 3, unit: 'BDL', unitPrice: 38.00, total: squares * 3 * 38.00 },
          { description: "Underlayment", quantity: Math.ceil(sqFt / 1000), unit: 'ROLL', unitPrice: 65.00, total: Math.ceil(sqFt / 1000) * 65.00 },
          { description: "Hip & Ridge", quantity: Math.ceil(squares * 1.2 / 33), unit: 'BDL', unitPrice: 55.00, total: Math.ceil(squares * 1.2 / 33) * 55.00 },
      ]);
  };

  const calculateTotal = (list: EstimateItem[]) => list.reduce((sum, i) => sum + i.total, 0);

  const handleSave = () => {
      if (!selectedLeadId) { addToast("Select a lead first", "error"); return; }
      const total = calculateTotal(items);
      const est: Estimate = {
          id: Date.now().toString(),
          leadId: selectedLeadId,
          name: estimateName,
          items: items,
          subtotal: total,
          tax: 0,
          total: total,
          createdAt: new Date().toLocaleDateString(),
          signature: signature || undefined,
          status: signature ? 'Signed' : 'Draft'
      };
      onSaveEstimate(selectedLeadId, est);
      addToast("Saved to CRM", "success");
  };

  // Signature Logic
  const startSign = (e: any) => {
      const ctx = signCanvasRef.current?.getContext('2d');
      if(ctx) { setIsSigning(true); ctx.beginPath(); const r = signCanvasRef.current!.getBoundingClientRect(); ctx.moveTo((e.touches?e.touches[0].clientX:e.clientX)-r.left, (e.touches?e.touches[0].clientY:e.clientY)-r.top); }
  };
  const drawSign = (e: any) => {
      if(isSigning) { const ctx = signCanvasRef.current?.getContext('2d'); if(ctx) { const r = signCanvasRef.current!.getBoundingClientRect(); ctx.lineTo((e.touches?e.touches[0].clientX:e.clientX)-r.left, (e.touches?e.touches[0].clientY:e.clientY)-r.top); ctx.stroke(); } }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative isolate">
      {/* TOP CONTROLS */}
      <div className="bg-white border-b border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setActiveTab('map')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'map' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                  <Satellite size={16}/> Satellite
              </button>
              <button onClick={() => setActiveTab('calculator')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'calculator' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                  <Calculator size={16}/> Proposal
              </button>
          </div>

          <div className="flex gap-2">
              <select 
                  value={selectedLeadId}
                  onChange={e => {
                      setSelectedLeadId(e.target.value);
                      const l = leads.find(x => x.id === e.target.value);
                      if (l && searchInputRef.current) searchInputRef.current.value = l.address; 
                  }}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-sm w-64"
              >
                  <option value="">Select Customer</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button onClick={handleSave} disabled={items.length === 0} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  <Save size={18}/> Save
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative z-0">
          
          {/* LEFT: MAP / TOOLS */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4 shrink-0 h-full relative z-0">
              {activeTab === 'map' ? (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-full relative z-0">
                      {mapError && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">{mapError}</div>
                      )}

                      <div className="relative mb-3">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                          <input ref={searchInputRef} placeholder="Search Property Address..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"/>
                      </div>
                      
                      <div className="relative flex-1 bg-slate-100 rounded-lg border border-slate-200 min-h-[400px] mb-3 overflow-hidden group">
                          {/* Map Container */}
                          <div 
                            ref={mapRef} 
                            className="absolute inset-0 w-full h-full z-0 transition-[filter] duration-300"
                            style={{ filter: highContrast ? 'contrast(1.4) brightness(1.1) saturate(0.8)' : 'none' }}
                          ></div>
                          
                          {/* Map Tools Overlay */}
                          <div className="absolute top-2 right-2 flex flex-col gap-2 z-[5]">
                              <button 
                                onClick={() => setHighContrast(!highContrast)} 
                                className="p-2 bg-white rounded shadow text-slate-600 hover:text-indigo-600"
                                title="Toggle High Contrast Mode"
                              >
                                  {highContrast ? <EyeOff size={16}/> : <Eye size={16}/>}
                              </button>
                          </div>

                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5] opacity-60">
                              <Crosshair size={32} className="text-white drop-shadow-md" strokeWidth={1.5} />
                          </div>
                      </div>

                      {/* ACTIONS ROW */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                          <button 
                              onClick={() => fetchRoofData()}
                              disabled={analyzing || !mapCenter}
                              className="py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs flex justify-center items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                          >
                              {analyzing ? <span className="animate-spin">Scan</span> : <Scan size={14}/>}
                              Auto-Measure
                          </button>
                          <button 
                              onClick={() => {
                                  if (drawingManager) {
                                      const mode = isDrawing ? null : window.google.maps.drawing.OverlayType.POLYGON;
                                      drawingManager.setDrawingMode(mode);
                                      setIsDrawing(!isDrawing);
                                  }
                              }}
                              className={`py-2.5 rounded-lg font-bold text-xs flex justify-center items-center gap-2 border transition-all ${isDrawing ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                          >
                              <PenTool size={14}/> {isDrawing ? 'Finish Drawing' : 'Manual Trace'}
                          </button>
                      </div>

                      {/* SELECTED POLYGON EDITOR (NEW) */}
                      {selectedPolyIndex !== null && polygons[selectedPolyIndex] && (
                          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg animate-fade-in">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-indigo-800">Edit Facet #{selectedPolyIndex + 1}</span>
                                  <button onClick={deleteSelectedPolygon} className="text-red-500 hover:text-red-700 text-xs underline">Remove</button>
                              </div>
                              <div className="flex items-center gap-2">
                                  <label className="text-xs text-indigo-600 font-medium">Pitch:</label>
                                  <input 
                                    type="range" min="0" max="18" 
                                    value={polygons[selectedPolyIndex].pitch}
                                    onChange={(e) => updatePolygonPitch(selectedPolyIndex, parseInt(e.target.value))}
                                    className="flex-1 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <span className="text-xs font-mono font-bold w-8 text-right">{polygons[selectedPolyIndex].pitch}/12</span>
                              </div>
                              <div className="text-[10px] text-indigo-500 mt-1 text-right">
                                  Area (pitched): {Math.round(polygons[selectedPolyIndex].areaSqFt * getPitchFactor(polygons[selectedPolyIndex].pitch)).toLocaleString()} sqft
                              </div>
                          </div>
                      )}
                      
                      {/* STATS */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center mb-2">
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Total Surface Area</p>
                              <p className="text-2xl font-extrabold text-slate-800">{totalSurfaceArea.toLocaleString()} <span className="text-sm font-normal text-slate-500">sqft</span></p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs font-bold text-slate-400 uppercase">Source</p>
                              <div className="flex items-center gap-1 justify-end text-sm font-bold text-indigo-600">
                                  {measurementSource === 'api' ? <Scan size={14}/> : <PenTool size={14}/>}
                                  {measurementSource === 'api' ? '3D Auto' : 'Manual'}
                              </div>
                          </div>
                      </div>

                      <button onClick={calculateEstimate} disabled={totalSurfaceArea === 0} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all">
                          Generate Proposal
                      </button>
                  </div>
              ) : (
                  // CALCULATOR SETTINGS SIDEBAR
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Calculator size={20} className="text-indigo-600"/> Estimator Config</h2>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">System Tier</label>
                              <div className="grid grid-cols-3 gap-2 mt-1">
                                  {['Good', 'Better', 'Best'].map(t => (
                                      <button key={t} onClick={() => setSelectedTier(t as EstimateTier)} className={`py-2 text-xs font-bold rounded border transition-all ${selectedTier === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{t}</button>
                                  ))}
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Waste %</label>
                                  <input type="number" value={wasteFactor} onChange={e => setWasteFactor(Number(e.target.value))} className="w-full p-2 border rounded font-mono mt-1"/>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Base SqFt</label>
                                  <input type="number" value={totalSurfaceArea} onChange={e => setTotalSurfaceArea(Number(e.target.value))} className="w-full p-2 border rounded font-mono mt-1 bg-slate-50" readOnly/>
                              </div>
                          </div>

                          <div className="p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800">
                              <strong>Note:</strong> Pricing adjusts automatically based on difficulty (pitch) and system tier selected.
                          </div>

                          <button onClick={calculateEstimate} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md">
                              Refresh Proposal
                          </button>
                      </div>
                  </div>
              )}

              {/* STATIC REFERENCE IMAGE (If Available) */}
              {staticImageUrl && (
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">Reference View</p>
                      <img src={staticImageUrl} alt="Reference" className="w-full h-40 object-cover rounded-lg opacity-90 hover:opacity-100 transition-opacity" />
                  </div>
              )}
          </div>

          {/* RIGHT: PREVIEW (Unchanged) */}
          <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden min-h-[600px] relative z-10">
              <div className="bg-slate-50 border-b border-slate-200 p-2 flex justify-center">
                  <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                      <button onClick={() => setViewMode('proposal')} className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 ${viewMode === 'proposal' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
                          <FileText size={14}/> Proposal
                      </button>
                      <button onClick={() => setViewMode('materials')} className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 ${viewMode === 'materials' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
                          <Truck size={14}/> Materials
                      </button>
                  </div>
              </div>
              
              <div className="flex-1 p-8 overflow-y-auto">
                  {items.length > 0 ? (
                      <div className="space-y-8 animate-fade-in">
                          {/* Document Content (Proposal/Materials) */}
                          <div className="flex justify-between border-b-2 border-slate-900 pb-4">
                              <div>
                                  <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">{viewMode === 'proposal' ? 'Roofing Proposal' : 'Material Order'}</h1>
                                  <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                  <p className="font-bold text-indigo-600 text-lg">Rafter AI</p>
                                  <p className="text-sm text-slate-500">Professional Roofing</p>
                              </div>
                          </div>

                          <table className="w-full text-sm text-left">
                              <thead className="text-slate-500 border-b border-slate-200 uppercase text-xs">
                                  <tr><th className="py-2">Item</th><th className="text-center py-2">Qty</th><th className="text-right py-2">Rate</th><th className="text-right py-2">Total</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {(viewMode === 'proposal' ? items : materialList).map((item, i) => (
                                      <tr key={i}>
                                          <td className="py-3 font-medium text-slate-800">{item.description}</td>
                                          <td className="py-3 text-center text-slate-600">{item.quantity} {item.unit}</td>
                                          <td className="py-3 text-right text-slate-600">${item.unitPrice.toFixed(2)}</td>
                                          <td className="py-3 text-right font-bold text-slate-900">${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>

                          <div className="flex justify-end pt-4 border-t border-slate-200">
                              <div className="w-64 space-y-2">
                                  <div className="flex justify-between font-bold text-xl text-slate-900">
                                      <span>Total</span>
                                      <span>${calculateTotal(viewMode === 'proposal' ? items : materialList).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                  </div>
                              </div>
                          </div>

                          {viewMode === 'proposal' && (
                              <div className="mt-12">
                                  <p className="text-xs text-slate-400 uppercase font-bold mb-2">Authorization</p>
                                  <div className="border-2 border-dashed border-slate-300 rounded h-24 relative bg-slate-50 hover:bg-white transition-colors" onMouseDown={(e) => {
                                      const ctx = signCanvasRef.current?.getContext('2d');
                                      if(ctx) { setIsSigning(true); ctx.beginPath(); const r = signCanvasRef.current!.getBoundingClientRect(); ctx.moveTo((e.touches?e.touches[0].clientX:e.clientX)-r.left, (e.touches?e.touches[0].clientY:e.clientY)-r.top); }
                                  }} onMouseMove={(e) => {
                                      if(isSigning) { const ctx = signCanvasRef.current?.getContext('2d'); if(ctx) { const r = signCanvasRef.current!.getBoundingClientRect(); ctx.lineTo((e.touches?e.touches[0].clientX:e.clientX)-r.left, (e.touches?e.touches[0].clientY:e.clientY)-r.top); ctx.stroke(); } }
                                  }} onMouseUp={() => setIsSigning(false)} onMouseLeave={() => setIsSigning(false)}>
                                      {!signature && <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold uppercase pointer-events-none">Sign Here</div>}
                                      <canvas ref={signCanvasRef} width={600} height={96} className="w-full h-full cursor-crosshair relative z-10"/>
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300">
                          <Layers size={64} strokeWidth={1} className="mb-4 opacity-50"/>
                          <p className="font-medium">Ready to measure</p>
                          <p className="text-sm mt-1">Search address on map to begin</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
      
      {showOrderModal && selectedLeadId && (
          <MaterialOrderModal 
              items={materialList} 
              lead={leads.find(l => l.id === selectedLeadId)!} 
              onClose={() => setShowOrderModal(false)}
          />
      )}
    </div>
  );
};

export default Estimator;