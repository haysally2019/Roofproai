import React, { useState, useEffect, useRef } from 'react';
import { EstimateItem, Lead, Estimate, EstimateTier } from '../types';
import { 
  Sparkles, Printer, Save, Trash2, Calculator, 
  MapPin, MousePointer2, Search, RotateCcw,
  CheckCircle2, Layers, PenTool, Satellite, FileText, Truck
} from 'lucide-react';
import { useStore } from '../lib/store';
import MaterialOrderModal from './MaterialOrderModal';

// Declare Google Maps types for TypeScript
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

const Estimator: React.FC<EstimatorProps> = ({ leads, onSaveEstimate }) => {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'calculator' | 'map'>('map');
  const [viewMode, setViewMode] = useState<'proposal' | 'materials'>('proposal');
  
  // --- ESTIMATE DATA ---
  const [measuredSqFt, setMeasuredSqFt] = useState<number>(0); // Flat area from map
  const [pitch, setPitch] = useState<number>(6); // 6/12 default
  const [wasteFactor, setWasteFactor] = useState<number>(10); // 10% default
  const [selectedTier, setSelectedTier] = useState<EstimateTier>('Better');
  
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [materialList, setMaterialList] = useState<EstimateItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [estimateName, setEstimateName] = useState<string>("Roof Replacement Proposal");

  // --- GOOGLE MAPS STATE ---
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [drawingManager, setDrawingManager] = useState<any>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Signature
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // --- 1. INITIALIZE MAPS ---
  useEffect(() => {
    if (!apiKey) {
        addToast("Missing Google Maps API Key in .env file", "error");
        return;
    }

    // Function to load the map
    const loadMap = () => {
        if (!mapRef.current || !window.google) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 39.8283, lng: -98.5795 }, // USA Center
            zoom: 4,
            mapTypeId: 'satellite',
            tilt: 0, // Force top-down view (critical for measuring)
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
        });

        setMapInstance(map);

        // Setup Drawing Manager
        const manager = new window.google.maps.drawing.DrawingManager({
            drawingMode: null, // Start in "Pan" mode
            drawingControl: false,
            polygonOptions: {
                fillColor: '#4f46e5',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#4f46e5',
                clickable: true,
                editable: true,
                zIndex: 1,
            },
        });

        manager.setMap(map);
        setDrawingManager(manager);

        // Event: Polygon Completed
        window.google.maps.event.addListener(manager, 'overlaycomplete', (event: any) => {
            if (event.type === 'polygon') {
                const newPoly = event.overlay;
                
                // Add listener to recalculate area if shape is edited
                newPoly.getPath().addListener('set_at', () => calculateTotalArea([...polygons, newPoly]));
                newPoly.getPath().addListener('insert_at', () => calculateTotalArea([...polygons, newPoly]));
                
                // Update State
                const newPolygons = [...polygons, newPoly];
                setPolygons(newPolygons);
                calculateTotalArea(newPolygons);
                
                // Reset to Pan mode
                manager.setDrawingMode(null);
                setIsDrawing(false);
            }
        });

        // Setup Search Box
        if (searchInputRef.current) {
            const searchBox = new window.google.maps.places.SearchBox(searchInputRef.current);
            map.addListener("bounds_changed", () => searchBox.setBounds(map.getBounds()));
            
            searchBox.addListener("places_changed", () => {
                const places = searchBox.getPlaces();
                if (!places || places.length === 0) return;
                
                const bounds = new window.google.maps.LatLngBounds();
                places.forEach((place: any) => {
                    if (!place.geometry || !place.geometry.location) return;
                    if (place.geometry.viewport) bounds.union(place.geometry.viewport);
                    else bounds.extend(place.geometry.location);
                });
                map.fitBounds(bounds);
                map.setZoom(20); // Zoom in close for roof work
            });
        }
    };

    // Load Script if not present
    if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry,places`;
        script.async = true;
        script.defer = true;
        script.onload = loadMap;
        document.head.appendChild(script);
    } else {
        loadMap();
    }
  }, [apiKey]);

  // Use a ref to access latest polygons inside event listeners if needed
  // But passing array to helper is safer.
  const calculateTotalArea = (currentPolys: any[]) => {
      if (!window.google) return;
      let totalAreaMeters = 0;
      
      currentPolys.forEach(poly => {
          totalAreaMeters += window.google.maps.geometry.spherical.computeArea(poly.getPath());
      });

      // Convert Sq Meters to Sq Feet (1 m² = 10.7639 sq ft)
      const totalSqFt = Math.round(totalAreaMeters * 10.7639);
      setMeasuredSqFt(totalSqFt);
  };

  // --- ACTIONS ---
  const toggleDrawingMode = () => {
      if (!drawingManager || !window.google) return;
      if (isDrawing) {
          drawingManager.setDrawingMode(null);
          setIsDrawing(false);
      } else {
          drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
          setIsDrawing(true);
      }
  };

  const clearMap = () => {
      polygons.forEach(p => p.setMap(null));
      setPolygons([]);
      setMeasuredSqFt(0);
  };

  // --- ESTIMATOR LOGIC ---
  const getPitchFactor = (p: number) => Math.sqrt(1 + Math.pow(p / 12, 2));

  const calculateEstimate = () => {
      if (measuredSqFt <= 0) {
          addToast("Please measure the roof area on the map first.", "error");
          return;
      }

      // 1. Calculate True Surface Area (Flat Area * Pitch Factor)
      const pitchMult = getPitchFactor(pitch);
      const trueSqFt = measuredSqFt * pitchMult;
      
      // 2. Add Waste
      const wasteMult = 1 + (wasteFactor / 100);
      const billableSqFt = trueSqFt * wasteMult;
      const squares = Math.ceil(billableSqFt / 100);

      // 3. Generate Line Items
      generateLineItems(billableSqFt, squares);
      
      setActiveTab('calculator');
      addToast(`Generated estimate for ${squares} Squares`, "success");
  };

  const generateLineItems = (sqFt: number, squares: number) => {
      // Pricing Logic
      let pricePerSq = 380; 
      let systemName = "3-Tab System";
      let warrantyName = "25-Year Warranty";

      if (selectedTier === 'Better') { 
          pricePerSq = 495; systemName = "Architectural System"; warrantyName = "Lifetime Warranty";
      }
      if (selectedTier === 'Best') { 
          pricePerSq = 675; systemName = "Class 4 Impact System"; warrantyName = "Platinum Warranty";
      }

      // Difficulty Add-ons
      if (pitch > 7) pricePerSq += 25;
      if (pitch > 10) pricePerSq += 45;

      // Proposal Items (Client Facing)
      const proposalItems: EstimateItem[] = [
          { description: "Mobilization, Site Prep & Safety", quantity: 1, unit: 'LS', unitPrice: 450.00, total: 450.00 },
          { description: "Tear-off & Debris Disposal", quantity: squares, unit: 'SQ', unitPrice: 95.00, total: squares * 95.00 },
          { description: `Install ${systemName}`, quantity: squares, unit: 'SQ', unitPrice: (pricePerSq - 95), total: squares * (pricePerSq - 95) },
          { description: "Ice & Water Shield Upgrade", quantity: Math.ceil(sqFt * 0.15), unit: 'SF', unitPrice: 2.50, total: Math.ceil(sqFt * 0.15) * 2.50 },
          { description: "Flashings & Ventilation Pkg", quantity: 1, unit: 'LS', unitPrice: 950.00, total: 950.00 },
          { description: warrantyName, quantity: 1, unit: 'EA', unitPrice: 0.00, total: 0.00 },
      ];

      // Material List (Ordering)
      const bundles = squares * 3;
      const matItems: EstimateItem[] = [
          { description: `${selectedTier} Shingles`, quantity: bundles, unit: 'BDL', unitPrice: 38.00, total: bundles * 38.00 },
          { description: "Underlayment", quantity: Math.ceil(sqFt / 1000), unit: 'ROLL', unitPrice: 65.00, total: Math.ceil(sqFt / 1000) * 65.00 },
          { description: "Hip & Ridge", quantity: Math.ceil(squares * 1.2 / 33), unit: 'BDL', unitPrice: 55.00, total: Math.ceil(squares * 1.2 / 33) * 55.00 },
          { description: "Starter Strip", quantity: Math.ceil(Math.sqrt(sqFt)*4/100), unit: 'BDL', unitPrice: 45.00, total: Math.ceil(Math.sqrt(sqFt)*4/100) * 45.00 },
          { description: "Ice & Water Shield", quantity: 2, unit: 'ROLL', unitPrice: 125.00, total: 250.00 },
          { description: "Coil Nails", quantity: 2, unit: 'BOX', unitPrice: 45.00, total: 90.00 },
          { description: "Ridge Vent", quantity: 10, unit: 'PC', unitPrice: 18.00, total: 180.00 },
      ];

      setItems(proposalItems);
      setMaterialList(matItems);
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
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* TOP CONTROLS */}
      <div className="bg-white border-b border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setActiveTab('map')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'map' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                  <Satellite size={16}/> Map Measure
              </button>
              <button onClick={() => setActiveTab('calculator')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'calculator' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                  <Calculator size={16}/> Calculator
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

      <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6 flex flex-col lg:flex-row gap-6">
          
          {/* LEFT PANEL */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0 h-full">
              {activeTab === 'map' ? (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-full">
                      <div className="relative mb-3">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                          <input ref={searchInputRef} placeholder="Search Address..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"/>
                      </div>
                      
                      <div ref={mapRef} className="flex-1 bg-slate-100 rounded-lg border border-slate-200 min-h-[400px] mb-3 relative overflow-hidden"></div>

                      <div className="flex gap-2 mb-4">
                          <button 
                              onClick={toggleDrawingMode}
                              className={`flex-1 py-2 rounded-lg font-bold text-sm flex justify-center items-center gap-2 border transition-all ${isDrawing ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                          >
                              <PenTool size={16}/> {isDrawing ? 'Finish Drawing' : 'Draw Roof'}
                          </button>
                          <button onClick={clearMap} className="px-3 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                              <RotateCcw size={16}/>
                          </button>
                      </div>
                      
                      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 mb-4">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-indigo-400 uppercase">Flat Area</span>
                              <span className="text-xl font-extrabold text-indigo-900">{measuredSqFt.toLocaleString()} sqft</span>
                          </div>
                          {measuredSqFt > 0 && (
                              <div className="text-xs text-indigo-600 flex items-center gap-1">
                                  <CheckCircle2 size={12}/> Measurements Active
                              </div>
                          )}
                      </div>

                      {/* Quick Params for Map View */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Pitch</label>
                              <div className="flex items-center gap-2">
                                  <input type="range" min="0" max="18" value={pitch} onChange={e => setPitch(Number(e.target.value))} className="flex-1"/>
                                  <span className="font-mono font-bold text-sm w-10 text-right">{pitch}/12</span>
                              </div>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Waste</label>
                              <div className="flex items-center gap-2">
                                  <input type="range" min="0" max="25" step="5" value={wasteFactor} onChange={e => setWasteFactor(Number(e.target.value))} className="flex-1"/>
                                  <span className="font-mono font-bold text-sm w-10 text-right">{wasteFactor}%</span>
                              </div>
                          </div>
                      </div>
                      
                      <button onClick={calculateEstimate} disabled={measuredSqFt === 0} className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 transition-all">
                          <Sparkles size={18}/> Generate Estimate
                      </button>
                  </div>
              ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h2 className="font-bold text-lg mb-6 flex items-center gap-2"><Calculator size={20} className="text-indigo-600"/> Estimator Settings</h2>
                      
                      {/* Tier Selector */}
                      <div className="mb-6">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">System Quality</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['Good', 'Better', 'Best'].map(t => (
                                  <button 
                                      key={t} 
                                      onClick={() => setSelectedTier(t as EstimateTier)} 
                                      className={`py-2 text-xs font-bold rounded border transition-all ${selectedTier === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                  >
                                      {t}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Base SqFt (Flat)</label>
                              <input 
                                  type="number" 
                                  value={measuredSqFt || ''} 
                                  onChange={e => setMeasuredSqFt(Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full p-2 border rounded font-mono"
                              />
                          </div>
                          
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm space-y-2">
                              <div className="flex justify-between">
                                  <span className="text-slate-500">Pitch Factor ({pitch}/12):</span>
                                  <span className="font-bold text-slate-800">{getPitchFactor(pitch).toFixed(3)}x</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-slate-500">Waste Factor ({wasteFactor}%):</span>
                                  <span className="font-bold text-slate-800">{(1 + wasteFactor/100).toFixed(2)}x</span>
                              </div>
                              <div className="border-t pt-2 flex justify-between font-bold text-indigo-700">
                                  <span>Total Billable SQ:</span>
                                  <span>{Math.ceil((measuredSqFt * getPitchFactor(pitch) * (1 + wasteFactor/100)) / 100)} SQ</span>
                              </div>
                          </div>

                          <button onClick={calculateEstimate} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md">
                              Update Estimate
                          </button>
                      </div>
                  </div>
              )}
          </div>

          {/* RIGHT PANEL: PREVIEW */}
          <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden min-h-[600px]">
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
                          {/* Doc Header */}
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

                          {/* Items Table */}
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

                          {/* Footer / Signature */}
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
                                  <div className="border-2 border-dashed border-slate-300 rounded h-24 relative bg-slate-50 hover:bg-white transition-colors" onMouseDown={startSign} onMouseMove={drawSign} onMouseUp={() => setIsSigning(false)}>
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
    </div>
  );
};

export default Estimator;