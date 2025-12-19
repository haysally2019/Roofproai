import React, { useState, useRef, useEffect } from 'react';
import { EstimateItem, Lead, Estimate, EstimateTier } from '../types';
import { 
  Sparkles, Printer, Save, PenTool, Satellite, Ruler, 
  LayoutGrid, Trash2, Check, Truck, Calculator, 
  MapPin, Lock, Unlock, Eye, FileText, AlertCircle, Info 
} from 'lucide-react';
import { useStore } from '../lib/store';
import MaterialOrderModal from './MaterialOrderModal';

interface EstimatorProps {
  leads: Lead[];
  onSaveEstimate: (leadId: string, estimate: Estimate) => void;
}

// Geometry Types
interface Point { x: number; y: number }
interface Facet {
    id: string;
    points: Point[];
    pitch: number; 
    sqFt: number;
}

const Estimator: React.FC<EstimatorProps> = ({ leads, onSaveEstimate }) => {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'calculator' | 'map'>('map');
  
  // --- CORE ESTIMATE INPUTS ---
  const [sqFt, setSqFt] = useState<number>(0); // Default to 0 to encourage measuring
  const [pitch, setPitch] = useState<number>(6); // 6/12
  const [wasteFactor, setWasteFactor] = useState<number>(10);
  const [selectedTier, setSelectedTier] = useState<EstimateTier>('Better');
  
  // Toggle between Client Proposal and Production List
  const [viewMode, setViewMode] = useState<'proposal' | 'materials'>('proposal');

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [materialList, setMaterialList] = useState<EstimateItem[]>([]);

  // --- GOOGLE MAPS MEASURE STATE ---
  const [address, setAddress] = useState('');
  const [apiKey, setApiKey] = useState(''); // Store API key locally or env
  const [mapLocked, setMapLocked] = useState(false);
  const [measureTool, setMeasureTool] = useState<'none' | 'calibrate' | 'draw'>('none');
  const [calibrationScale, setCalibrationScale] = useState<number | null>(null); // pixels per foot
  
  // Drawing State
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [facets, setFacets] = useState<Facet[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibrationLength, setCalibrationLength] = useState('10');

  // Save State
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [estimateName, setEstimateName] = useState<string>("Roof Replacement Proposal");

  // Signature State
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  // Material Order Modal
  const [showOrderModal, setShowOrderModal] = useState(false);

  // --- CALCULATOR ENGINE ---

  // 1. Generate Client-Facing Proposal (System Style)
  const generateProposalItems = (actualSqFt: number, squares: number): EstimateItem[] => {
      let pricePerSq = 380; // Base market rate per square (Labor + Material + Overhead)
      let systemName = "3-Tab Shingle System";
      let warrantyName = "Standard Manufacturer Warranty (25 Year)";

      // Tier Logic
      if (selectedTier === 'Better') { 
          pricePerSq = 495; 
          systemName = "Architectural Laminate System (Limited Lifetime)"; 
          warrantyName = "Enhanced Lifetime Warranty + 10 Year Workmanship";
      }
      if (selectedTier === 'Best') { 
          pricePerSq = 675; 
          systemName = "Premium Impact Resistant (Class 4) System"; 
          warrantyName = "Platinum Lifetime Warranty + 25 Year Workmanship";
      }

      // Pitch Difficulty Charges
      if (pitch >= 7 && pitch <= 9) pricePerSq += 25; // Steep
      if (pitch > 9) pricePerSq += 55; // Very steep

      // Calculations
      const tearOffTotal = squares * 95.00; // $95/sq for tear off
      const installTotal = squares * (pricePerSq - 95.00); // Remainder is install price

      return [
          { description: "Mobilization, Site Prep & Safety Setup", quantity: 1, unit: 'LS', unitPrice: 450.00, total: 450.00 },
          { description: "Tear-off Existing Roof System & Debris Disposal", quantity: squares, unit: 'SQ', unitPrice: 95.00, total: tearOffTotal },
          { description: `Installation of ${systemName}`, quantity: squares, unit: 'SQ', unitPrice: (pricePerSq - 95), total: installTotal },
          { description: "Ice & Water Shield Upgrade (Eaves & Valleys)", quantity: Math.ceil(actualSqFt * 0.15), unit: 'SF', unitPrice: 2.50, total: Math.ceil(actualSqFt * 0.15) * 2.50 },
          { description: "Complete Flashing & Ventilation Package", quantity: 1, unit: 'SYS', unitPrice: 1200.00, total: 1200.00 },
          { description: "Magnetic Nail Sweep & Final Inspection", quantity: 1, unit: 'LS', unitPrice: 250.00, total: 250.00 },
          { description: warrantyName, quantity: 1, unit: 'EA', unitPrice: 0.00, total: 0.00 },
      ];
  };

  // 2. Generate Internal Material List (For Orders)
  const generateMaterialList = (actualSqFt: number, squares: number): EstimateItem[] => {
      const bundles = squares * 3;
      const ridgeLen = Math.ceil(squares * 1.5); // approx linear feet
      const starterLen = Math.ceil(Math.sqrt(actualSqFt) * 4); 

      return [
          { description: `${selectedTier} Shingles - Bundles`, quantity: bundles, unit: 'BDL', unitPrice: 38.00, total: bundles * 38.00 },
          { description: "Hip & Ridge Cap", quantity: Math.ceil(ridgeLen / 33), unit: 'BDL', unitPrice: 55.00, total: Math.ceil(ridgeLen / 33) * 55.00 },
          { description: "Starter Strip", quantity: Math.ceil(starterLen / 100), unit: 'BDL', unitPrice: 42.00, total: Math.ceil(starterLen / 100) * 42.00 },
          { description: "Synthetic Underlayment", quantity: Math.ceil(actualSqFt / 1000), unit: 'ROLL', unitPrice: 65.00, total: Math.ceil(actualSqFt / 1000) * 65.00 },
          { description: "Ice & Water Shield", quantity: 2, unit: 'ROLL', unitPrice: 125.00, total: 250.00 },
          { description: "Coil Nails (1-1/4\")", quantity: 2, unit: 'BOX', unitPrice: 45.00, total: 90.00 },
          { description: "Plastic Cap Nails", quantity: 1, unit: 'BOX', unitPrice: 35.00, total: 35.00 },
          { description: "Drip Edge (White)", quantity: Math.ceil(starterLen / 10), unit: 'PC', unitPrice: 12.00, total: Math.ceil(starterLen / 10) * 12.00 },
          { description: "Pipe Jack Flashings (Lead)", quantity: 4, unit: 'EA', unitPrice: 28.00, total: 112.00 },
          { description: "Ridge Vent (4ft)", quantity: 10, unit: 'PC', unitPrice: 18.00, total: 180.00 },
      ];
  };

  const calculateEstimate = () => {
      if (sqFt <= 0) {
          addToast("Please enter or measure Square Footage first.", "error");
          return;
      }

      // Calculate Pitch Multiplier (Hypotenuse of pitch triangle)
      // Multiplier = sqrt(1 + (pitch/12)^2)
      const pitchMultiplier = Math.sqrt(1 + Math.pow(pitch / 12, 2));
      
      // Calculate Waste
      const wasteMult = 1 + (wasteFactor / 100);

      const actualSqFt = sqFt * pitchMultiplier * wasteMult;
      const squares = Math.ceil(actualSqFt / 100);

      const proposal = generateProposalItems(actualSqFt, squares);
      const materials = generateMaterialList(actualSqFt, squares);

      setItems(proposal);
      setMaterialList(materials);
      addToast(`Estimate generated for ${squares} Squares`, "success");
  };

  // --- MAP & DRAWING LOGIC ---

  const handleCanvasClick = (e: React.MouseEvent) => {
      if (!mapLocked) return;
      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (measureTool === 'calibrate') {
          if (calibrationPoints.length < 2) {
              const newPoints = [...calibrationPoints, { x, y }];
              setCalibrationPoints(newPoints);
              if (newPoints.length === 2) {
                  setShowCalibrationModal(true);
              }
          }
      } else if (measureTool === 'draw') {
          setCurrentPoints([...currentPoints, { x, y }]);
      }
  };

  const finalizeCalibration = () => {
      const p1 = calibrationPoints[0];
      const p2 = calibrationPoints[1];
      const distPixels = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const distFeet = parseFloat(calibrationLength);
      
      if (distFeet > 0) {
          setCalibrationScale(distPixels / distFeet);
          setShowCalibrationModal(false);
          setCalibrationPoints([]);
          setMeasureTool('draw');
          addToast(`Scale set: ${(distPixels/distFeet).toFixed(2)} px/ft. Now draw measurements.`, "success");
      }
  };

  const completeFacet = () => {
      if (currentPoints.length < 3) return;
      if (!calibrationScale) {
          addToast("Please calibrate scale first (yellow ruler tool)", "error");
          return;
      }

      // Shoelace formula for area
      let area = 0;
      for (let i = 0; i < currentPoints.length; i++) {
          const j = (i + 1) % currentPoints.length;
          area += currentPoints[i].x * currentPoints[j].y;
          area -= currentPoints[j].x * currentPoints[i].y;
      }
      area = Math.abs(area / 2);

      // Convert px area to sq ft area
      const realSqFt = area / (calibrationScale * calibrationScale);

      const newFacet: Facet = {
          id: Date.now().toString(),
          points: currentPoints,
          pitch: pitch, // Use current global pitch setting
          sqFt: Math.round(realSqFt)
      };

      setFacets([...facets, newFacet]);
      setCurrentPoints([]);
  };

  const clearMeasurements = () => {
      setFacets([]);
      setCurrentPoints([]);
      setCalibrationPoints([]);
      setCalibrationScale(null);
      setMeasureTool('none');
  };

  // Render Canvas
  useEffect(() => {
      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Finished Facets
      facets.forEach(f => {
          ctx.beginPath();
          ctx.moveTo(f.points[0].x, f.points[0].y);
          f.points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.fillStyle = 'rgba(79, 70, 229, 0.3)'; // Indigo fill
          ctx.fill();
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Label
          const center = f.points.reduce((acc, p) => ({x: acc.x + p.x, y: acc.y + p.y}), {x:0,y:0});
          center.x /= f.points.length;
          center.y /= f.points.length;
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px sans-serif';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 3;
          ctx.fillText(`${f.sqFt} sf`, center.x - 15, center.y);
          ctx.shadowBlur = 0;
      });

      // 2. Draw Active Lines
      if (currentPoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          currentPoints.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.strokeStyle = '#ef4444'; // Red
          ctx.lineWidth = 2;
          ctx.stroke();
          // Points
          currentPoints.forEach(p => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
              ctx.fillStyle = '#ef4444';
              ctx.fill();
          });
      }

      // 3. Draw Calibration
      if (calibrationPoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(calibrationPoints[0].x, calibrationPoints[0].y);
          if (calibrationPoints[1]) ctx.lineTo(calibrationPoints[1].x, calibrationPoints[1].y);
          ctx.strokeStyle = '#f59e0b'; // Amber
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
      }
  }, [facets, currentPoints, calibrationPoints, drawCanvasRef.current?.width]);

  const applyMapMeasurements = () => {
      const totalArea = facets.reduce((acc, f) => acc + f.sqFt, 0);
      setSqFt(Math.round(totalArea));
      setActiveTab('calculator');
      addToast(`Applied ${Math.round(totalArea)} sqft base to calculator.`, "success");
  };

  // --- SAVE LOGIC ---
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
      addToast("Proposal saved to CRM", "success");
  };

  // --- SIGNATURE LOGIC ---
  const startSign = (e: any) => {
      const ctx = signCanvasRef.current?.getContext('2d');
      if(!ctx) return;
      setIsSigning(true);
      ctx.beginPath();
      const rect = signCanvasRef.current!.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };
  const drawSign = (e: any) => {
      if (!isSigning) return;
      const ctx = signCanvasRef.current?.getContext('2d');
      if(!ctx) return;
      const rect = signCanvasRef.current!.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      ctx.lineTo(clientX - rect.left, clientY - rect.top);
      ctx.stroke();
  };
  const endSign = () => {
      setIsSigning(false);
      setSignature(signCanvasRef.current?.toDataURL() || null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* --- TOP BAR CONTROLS --- */}
      <div className="bg-white border-b border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex bg-slate-100 rounded-lg p-1">
              <button 
                  onClick={() => setActiveTab('map')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'map' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <Satellite size={16}/> 1. Measure
              </button>
              <button 
                  onClick={() => setActiveTab('calculator')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'calculator' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <Calculator size={16}/> 2. Estimate
              </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
              <select 
                  value={selectedLeadId}
                  onChange={(e) => {
                      setSelectedLeadId(e.target.value);
                      const lead = leads.find(l => l.id === e.target.value);
                      if (lead) setAddress(lead.address); // Auto-fill address
                  }}
                  className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none flex-1 md:w-64"
              >
                  <option value="">Select Customer...</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {items.length > 0 && (
                  <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm whitespace-nowrap">
                      <Save size={18}/> Save Proposal
                  </button>
              )}
          </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto h-full flex flex-col lg:flex-row gap-6">
              
              {/* --- LEFT PANEL: TOOLS --- */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
                  
                  {/* GOOGLE MAPS MEASURE TOOL */}
                  {activeTab === 'map' && (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-fade-in flex-1 flex flex-col">
                          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <Satellite size={18} className="text-indigo-600"/> Google Maps Measure
                          </h2>

                          {/* Address & API Controls */}
                          <div className="space-y-3 mb-4">
                              <div className="relative">
                                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                  <input 
                                      value={address} 
                                      onChange={e => setAddress(e.target.value)} 
                                      placeholder="Enter Property Address" 
                                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                      disabled={mapLocked}
                                  />
                              </div>
                              
                              <div className="flex gap-2">
                                  <button 
                                      onClick={() => setMapLocked(!mapLocked)}
                                      className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mapLocked ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                  >
                                      {mapLocked ? <><Lock size={14}/> Unlock Map</> : <><Unlock size={14}/> Lock to Measure</>}
                                  </button>
                              </div>

                              {!apiKey && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                      <div className="flex items-center gap-1 font-bold mb-1"><AlertCircle size={12}/> API Key Missing</div>
                                      <input 
                                          value={apiKey} 
                                          onChange={e => setApiKey(e.target.value)} 
                                          placeholder="Enter Google Maps API Key" 
                                          className="w-full mt-1 p-1 border border-amber-300 rounded"
                                      />
                                      <p className="mt-1 opacity-75">Map may not load without a valid key.</p>
                                  </div>
                              )}
                          </div>

                          {/* Map Container */}
                          <div className="relative flex-1 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 min-h-[350px]">
                              {/* Overlay Canvas (Only visible when Locked) */}
                              {mapLocked && (
                                  <>
                                      <canvas 
                                          ref={drawCanvasRef}
                                          width={600} 
                                          height={400} // This should be dynamic in a real app (ResizeObserver)
                                          className="absolute inset-0 w-full h-full z-20 cursor-crosshair"
                                          onClick={handleCanvasClick}
                                      />
                                      
                                      {/* Calibration Modal */}
                                      {showCalibrationModal && (
                                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl border border-slate-200 z-30 w-48">
                                              <p className="text-xs font-bold mb-2">Length of line (ft):</p>
                                              <div className="flex gap-2">
                                                  <input 
                                                      value={calibrationLength} 
                                                      onChange={e => setCalibrationLength(e.target.value)}
                                                      className="w-full border rounded px-2 py-1 text-sm"
                                                      autoFocus
                                                  />
                                                  <button onClick={finalizeCalibration} className="bg-amber-500 text-white px-2 rounded text-xs font-bold">Set</button>
                                              </div>
                                          </div>
                                      )}
                                  </>
                              )}

                              {/* Google Maps Iframe */}
                              {address ? (
                                  <iframe
                                      className="absolute inset-0 w-full h-full z-10"
                                      loading="lazy"
                                      allowFullScreen
                                      referrerPolicy="no-referrer-when-downgrade"
                                      src={`https://www.google.com/maps/embed/v1/place?key=${apiKey || 'YOUR_API_KEY_HERE'}&q=${encodeURIComponent(address)}&maptype=satellite`}
                                      style={{ pointerEvents: mapLocked ? 'none' : 'auto' }}
                                  ></iframe>
                              ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-0">
                                      <Satellite size={48} className="mb-2 opacity-50"/>
                                      <p className="text-sm">Enter address to load satellite view</p>
                                  </div>
                              )}
                          </div>

                          {/* Drawing Tools (Only when Locked) */}
                          {mapLocked && (
                              <div className="mt-4 flex flex-col gap-3">
                                  <div className="flex gap-2">
                                      <button 
                                          onClick={() => setMeasureTool('calibrate')}
                                          className={`flex-1 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 ${measureTool === 'calibrate' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200'}`}
                                      >
                                          <Ruler size={14}/> 1. Calibrate
                                      </button>
                                      <button 
                                          onClick={() => setMeasureTool('draw')}
                                          className={`flex-1 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 ${measureTool === 'draw' ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200'}`}
                                      >
                                          <PenTool size={14}/> 2. Draw
                                      </button>
                                      <button onClick={clearMeasurements} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200">
                                          <Trash2 size={16}/>
                                      </button>
                                  </div>

                                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                                      <span className="text-xs font-bold text-slate-500">{facets.length} Areas Drawn</span>
                                      {currentPoints.length > 2 && (
                                          <button onClick={completeFacet} className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded shadow hover:bg-emerald-600">
                                              <Check size={14} className="inline mr-1"/> Close Shape
                                          </button>
                                      )}
                                  </div>

                                  <button 
                                      onClick={applyMapMeasurements}
                                      disabled={facets.length === 0}
                                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                                  >
                                      Use {facets.reduce((acc, f) => acc + f.sqFt, 0)} SqFt
                                  </button>
                              </div>
                          )}
                      </div>
                  )}

                  {/* CALCULATOR INPUTS */}
                  {activeTab === 'calculator' && (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <Calculator size={18} className="text-indigo-600"/> Quote Engine
                          </h2>
                          
                          <div className="space-y-5">
                              {/* Tier Selector */}
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">System Quality</label>
                                  <div className="grid grid-cols-3 gap-2">
                                      {['Good', 'Better', 'Best'].map(t => (
                                          <button 
                                              key={t}
                                              onClick={() => setSelectedTier(t as EstimateTier)}
                                              className={`py-2 text-xs font-bold rounded-lg border transition-all ${selectedTier === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                          >
                                              {t}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Base SqFt</label>
                                      <input 
                                          type="number" 
                                          value={sqFt}
                                          onChange={e => setSqFt(Number(e.target.value))}
                                          className="w-full p-2 border border-slate-200 rounded-lg font-mono text-sm"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Pitch ({pitch}/12)</label>
                                      <input 
                                          type="range" 
                                          min="0" max="18" 
                                          value={pitch}
                                          onChange={e => setPitch(Number(e.target.value))}
                                          className="w-full accent-indigo-600"
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Waste Factor ({wasteFactor}%)</label>
                                  <input 
                                      type="range" 
                                      min="0" max="25" step="5"
                                      value={wasteFactor}
                                      onChange={e => setWasteFactor(Number(e.target.value))}
                                      className="w-full accent-indigo-600"
                                  />
                              </div>

                              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800">
                                  <div className="flex justify-between font-bold mb-1">
                                      <span>Pitch Factor:</span>
                                      <span>{Math.sqrt(1 + Math.pow(pitch / 12, 2)).toFixed(3)}x</span>
                                  </div>
                                  <div className="flex justify-between font-bold">
                                      <span>Total Billable:</span>
                                      <span>{Math.ceil(sqFt * Math.sqrt(1 + Math.pow(pitch / 12, 2)) * (1 + wasteFactor / 100))} SqFt</span>
                                  </div>
                              </div>

                              <button 
                                  onClick={calculateEstimate}
                                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex justify-center items-center gap-2 shadow-lg"
                              >
                                  <Sparkles size={18}/> Generate Proposal
                              </button>
                          </div>
                      </div>
                  )}
              </div>

              {/* --- RIGHT PANEL: PREVIEW --- */}
              <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden min-h-[600px]">
                  
                  {items.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12">
                          <LayoutGrid size={64} strokeWidth={1} className="mb-4 opacity-50"/>
                          <p className="text-lg font-medium text-slate-400">Proposal Preview</p>
                          <p className="text-sm text-slate-400 text-center max-w-xs mt-2">Use the Map Measure tool or Calculator to generate a professional quote.</p>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col">
                          {/* Toggle View Mode (Quote vs List) */}
                          <div className="bg-slate-50 border-b border-slate-200 p-2 flex justify-center">
                              <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
                                  <button 
                                      onClick={() => setViewMode('proposal')}
                                      className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'proposal' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                  >
                                      <FileText size={14}/> Client Proposal
                                  </button>
                                  <button 
                                      onClick={() => setViewMode('materials')}
                                      className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'materials' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                  >
                                      <Truck size={14}/> Material Order
                                  </button>
                              </div>
                          </div>

                          <div className="flex-1 p-8 overflow-y-auto">
                              {/* Header */}
                              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                                  <div>
                                      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                          {viewMode === 'proposal' ? 'ROOFING PROPOSAL' : 'MATERIAL ORDER'}
                                      </h1>
                                      <p className="text-slate-500 text-sm mt-1">Date: {new Date().toLocaleDateString()}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-lg text-indigo-600">Rafter AI Roofing</p>
                                      <p className="text-sm text-slate-500">123 Builder Lane, TX</p>
                                  </div>
                              </div>

                              {/* Customer Info */}
                              {selectedLeadId && (
                                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-8 flex justify-between items-center">
                                      <div>
                                          <p className="text-xs font-bold text-slate-400 uppercase">Prepared For</p>
                                          <p className="font-bold text-slate-800">{leads.find(l => l.id === selectedLeadId)?.name}</p>
                                          <p className="text-sm text-slate-500">{leads.find(l => l.id === selectedLeadId)?.address}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-xs font-bold text-slate-400 uppercase">System</p>
                                          <p className="font-bold text-indigo-600">{selectedTier} Tier</p>
                                      </div>
                                  </div>
                              )}

                              {/* Line Items Table */}
                              <table className="w-full text-sm text-left">
                                  <thead className="text-slate-500 border-b border-slate-200">
                                      <tr>
                                          <th className="py-2 font-bold w-1/2">Description</th>
                                          <th className="py-2 font-bold text-center">Qty</th>
                                          <th className="py-2 font-bold text-right">Rate</th>
                                          <th className="py-2 font-bold text-right">Total</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {(viewMode === 'proposal' ? items : materialList).map((item, i) => (
                                          <tr key={i}>
                                              <td className="py-4 font-medium text-slate-800">{item.description}</td>
                                              <td className="py-4 text-center text-slate-600">{item.quantity} {item.unit}</td>
                                              <td className="py-4 text-right text-slate-600">${item.unitPrice.toFixed(2)}</td>
                                              <td className="py-4 text-right font-bold text-slate-900">${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>

                              {/* Totals */}
                              <div className="flex justify-end mt-8 pt-4 border-t border-slate-200">
                                  <div className="w-64 space-y-2">
                                      <div className="flex justify-between text-slate-600">
                                          <span>Subtotal</span>
                                          <span>${calculateTotal(viewMode === 'proposal' ? items : materialList).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                      </div>
                                      {viewMode === 'proposal' && (
                                          <>
                                              <div className="flex justify-between text-slate-600">
                                                  <span>Tax</span>
                                                  <span>$0.00</span>
                                              </div>
                                              <div className="flex justify-between text-xl font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                                                  <span>Total</span>
                                                  <span>${calculateTotal(viewMode === 'proposal' ? items : materialList).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                              </div>
                                          </>
                                      )}
                                  </div>
                              </div>

                              {/* Signature Block (Only on Proposal) */}
                              {viewMode === 'proposal' && (
                                  <div className="mt-12 pt-8 border-t border-slate-100 break-inside-avoid">
                                      <p className="text-xs text-slate-500 mb-4">By signing below, you agree to the terms of this proposal. A 50% deposit is required to schedule.</p>
                                      <div className="border-2 border-dashed border-slate-300 rounded-xl h-32 w-full relative bg-slate-50 overflow-hidden">
                                          {signature ? (
                                              <img src={signature} className="w-full h-full object-contain" alt="Signature"/>
                                          ) : (
                                              <>
                                                  <canvas 
                                                      ref={signCanvasRef}
                                                      width={600}
                                                      height={128}
                                                      className="absolute inset-0 w-full h-full cursor-crosshair z-10"
                                                      onMouseDown={startSign}
                                                      onMouseMove={drawSign}
                                                      onMouseUp={endSign}
                                                      onTouchStart={startSign}
                                                      onTouchMove={drawSign}
                                                      onTouchEnd={endSign}
                                                  />
                                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-bold text-xl uppercase tracking-widest">
                                                      Sign Here
                                                  </div>
                                              </>
                                          )}
                                      </div>
                                      <div className="flex justify-between mt-2">
                                          <p className="text-xs text-slate-400">X__________________________</p>
                                          {signature && <button onClick={() => setSignature(null)} className="text-xs text-red-500 hover:underline">Clear</button>}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Material Order Modal */}
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