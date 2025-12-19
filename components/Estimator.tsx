
import React, { useState, useRef, useEffect } from 'react';
import { generateSmartEstimate, getRoofDataFromAddress } from '../services/geminiService';
import { RoofType, EstimateItem, Lead, Estimate, EstimateTier, RoofMeasurement } from '../types';
import { Loader2, Sparkles, Printer, Save, FileCheck, PenTool, UploadCloud, FileText, Eye, Edit, Satellite, MapPin, Sun, Ruler, LayoutGrid, ArrowDown, ArrowUp, MousePointer2, Move, Trash2, Undo, Check, Info, Truck } from 'lucide-react';
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
    pitch: number; // Integer 0-18
    sqFt: number;
}

const Estimator: React.FC<EstimatorProps> = ({ leads, onSaveEstimate }) => {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'manual' | 'satellite'>('manual');
  
  // Estimate Inputs
  const [roofType, setRoofType] = useState<RoofType>(RoofType.ASPHALT);
  const [sqFt, setSqFt] = useState<number>(2500);
  const [difficulty, setDifficulty] = useState<string>("Medium");
  const [wasteFactor, setWasteFactor] = useState<number>(10);
  const [selectedTier, setSelectedTier] = useState<EstimateTier>('Better');

  const [isGenerating, setIsGenerating] = useState(false);
  const [items, setItems] = useState<EstimateItem[]>([]);
  
  // --- SATELLITE MEASURE STATE ---
  const [measureAddress, setMeasureAddress] = useState('');
  const [mapLocked, setMapLocked] = useState(false);
  const [measureTool, setMeasureTool] = useState<'none' | 'calibrate' | 'draw'>('none');
  const [calibrationScale, setCalibrationScale] = useState<number | null>(null); // pixels per foot
  
  // Solar Data
  const [solarData, setSolarData] = useState<RoofMeasurement | null>(null);
  const [loadingSolar, setLoadingSolar] = useState(false);

  // Drawing State
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [facets, setFacets] = useState<Facet[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [isCalibratingPopupOpen, setIsCalibratingPopupOpen] = useState(false);
  const [calibrationLengthInput, setCalibrationLengthInput] = useState('10');

  // Save State
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [estimateName, setEstimateName] = useState<string>("New Estimate");

  // Signature State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Profit/Commission Logic
  const [showProfit, setShowProfit] = useState(false);
  const commissionRate = 0.10; // 10%

  // Mobile Toggle
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');

  // Order Materials State
  const [showOrderModal, setShowOrderModal] = useState(false);

  // --- MEASUREMENT LOGIC ---

  // Pitch Multipliers (Exact Math)
  const getPitchMultiplier = (pitch: number) => {
      // Multiplier = sqrt(1 + (pitch/12)^2)
      return Math.sqrt(1 + Math.pow(pitch / 12, 2));
  };

  const calculatePolygonArea = (points: Point[]) => {
      let area = 0;
      for (let i = 0; i < points.length; i++) {
          let j = (i + 1) % points.length;
          area += points[i].x * points[j].y;
          area -= points[j].x * points[i].y;
      }
      return Math.abs(area / 2);
  };

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
                  setIsCalibratingPopupOpen(true);
              }
          }
      } else if (measureTool === 'draw') {
          setCurrentPoints([...currentPoints, { x, y }]);
      }
  };

  const completeShape = () => {
      if (currentPoints.length < 3) return;
      if (!calibrationScale) {
          addToast("Please calibrate the map scale first.", "error");
          return;
      }
      
      const pixelArea = calculatePolygonArea(currentPoints);
      // Area in sq ft = PixelArea / (Scale * Scale)
      const rawSqFt = pixelArea / (calibrationScale * calibrationScale);
      
      const newFacet: Facet = {
          id: Date.now().toString(),
          points: currentPoints,
          pitch: 6, // Default to 6/12
          sqFt: Math.round(rawSqFt)
      };

      setFacets([...facets, newFacet]);
      setCurrentPoints([]);
  };

  const finishCalibration = () => {
      const p1 = calibrationPoints[0];
      const p2 = calibrationPoints[1];
      const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const feet = parseFloat(calibrationLengthInput);
      
      if (feet > 0) {
          setCalibrationScale(pixelDistance / feet);
          setIsCalibratingPopupOpen(false);
          setCalibrationPoints([]);
          setMeasureTool('draw');
          addToast("Scale calibrated! Now draw the roof sections.", "success");
      }
  };

  const getSolarData = async () => {
      if(!measureAddress) return;
      setLoadingSolar(true);
      const data = await getRoofDataFromAddress(measureAddress);
      setSolarData(data);
      setLoadingSolar(false);
  };

  // Render the Drawing Canvas
  useEffect(() => {
      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Finished Facets
      facets.forEach(facet => {
          ctx.beginPath();
          ctx.moveTo(facet.points[0].x, facet.points[0].y);
          facet.points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.fillStyle = 'rgba(79, 70, 229, 0.3)'; // Indigo-500 transparent
          ctx.fill();
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Label Area
          const center = facet.points.reduce((acc, p) => ({x: acc.x + p.x, y: acc.y + p.y}), {x:0, y:0});
          center.x /= facet.points.length;
          center.y /= facet.points.length;
          
          const multiplier = getPitchMultiplier(facet.pitch);
          const trueArea = Math.round(facet.sqFt * multiplier);

          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px Inter';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 4;
          ctx.fillText(`${trueArea} sqft`, center.x - 20, center.y);
          ctx.font = '10px Inter';
          ctx.fillText(`${facet.pitch}/12`, center.x - 10, center.y + 12);
          ctx.shadowBlur = 0;
      });

      // Draw Current Lines (Active)
      if (currentPoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          currentPoints.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.strokeStyle = '#ef4444'; // Red for active
          ctx.lineWidth = 2;
          ctx.stroke();
          
          currentPoints.forEach(p => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
              ctx.fillStyle = '#ef4444';
              ctx.fill();
          });
      }

      // Draw Calibration Line
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

  }, [facets, currentPoints, calibrationPoints]);

  const getTotalMeasuredSqFt = () => {
      return facets.reduce((acc, facet) => {
          const mult = getPitchMultiplier(facet.pitch);
          return acc + Math.round(facet.sqFt * mult);
      }, 0);
  };

  const applyMeasurementToCalculator = () => {
      const total = getTotalMeasuredSqFt();
      if (total === 0) return;
      setSqFt(total);
      setActiveTab('manual');
      addToast("Measurements applied to calculator", "success");
  };

  // --- CALCULATOR ENGINE ---
  const calculateMaterials = () => {
      // 1. Calculate Waste Adjusted SQ
      const wasteMultiplier = 1 + (wasteFactor / 100);
      const totalSqFt = sqFt * wasteMultiplier;
      const squares = Math.ceil(totalSqFt / 100);
      const bundles = squares * 3;

      // 2. Pricing Logic based on Tier
      let shinglePrice = 35.00; // Good (3-tab)
      let shingleName = "3-Tab Shingle (25yr)";
      if (selectedTier === 'Better') { shinglePrice = 45.00; shingleName = "Architectural Shingle (Limited Lifetime)"; }
      if (selectedTier === 'Best') { shinglePrice = 65.00; shingleName = "Class 4 Impact Resistant Shingle"; }

      // 3. Accessory Logic
      const ridgeLen = Math.ceil(squares * 1.5); // Estimate 1.5 LF per square if unknown
      const eaveLen = Math.ceil(Math.sqrt(sqFt) * 4); // Estimate perimeter
      const valleyLen = Math.ceil(squares * 0.5);

      const ridgeBundles = Math.ceil(ridgeLen / 33); // 33 LF per bundle
      const starterBundles = Math.ceil(eaveLen / 100); // 100 LF per bundle
      const iceWaterRolls = Math.ceil(valleyLen / 66); // 66 LF per roll
      const dripEdgePcs = Math.ceil(eaveLen / 10); // 10ft sticks

      const newItems: EstimateItem[] = [
          { description: `Remove Existing Roofing (1 Layer)`, quantity: squares, unit: 'SQ', unitPrice: 45.00, total: squares * 45.00 },
          { description: `${shingleName} - (${selectedTier})`, quantity: bundles, unit: 'BDL', unitPrice: shinglePrice, total: bundles * shinglePrice },
          { description: `Synthetic Underlayment`, quantity: Math.ceil(totalSqFt / 1000), unit: 'ROLL', unitPrice: 65.00, total: Math.ceil(totalSqFt / 1000) * 65.00 },
          { description: `Hip & Ridge Cap`, quantity: ridgeBundles, unit: 'BDL', unitPrice: 55.00, total: ridgeBundles * 55.00 },
          { description: `Starter Strip`, quantity: starterBundles, unit: 'BDL', unitPrice: 45.00, total: starterBundles * 45.00 },
          { description: `Ice & Water Shield (Valleys/Eaves)`, quantity: iceWaterRolls, unit: 'ROLL', unitPrice: 125.00, total: iceWaterRolls * 125.00 },
          { description: `Drip Edge (Alum)`, quantity: dripEdgePcs, unit: 'EA', unitPrice: 12.50, total: dripEdgePcs * 12.50 },
          { description: `Pipe Jack Flashings`, quantity: 4, unit: 'EA', unitPrice: 35.00, total: 140.00 },
          { description: `Dumpster & Disposal`, quantity: 1, unit: 'EA', unitPrice: 550.00, total: 550.00 },
          { description: `Permit & Admin`, quantity: 1, unit: 'EA', unitPrice: 350.00, total: 350.00 },
      ];

      setItems(newItems);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setTimeout(() => {
        calculateMaterials();
        setIsGenerating(false);
        setMobileView('preview');
        addToast("Estimate generated with advanced material breakdown", "success");
    }, 800);
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + item.total, 0);
  const calculateCost = () => items.reduce((sum, item) => sum + (item.total * 0.65), 0); 

  const handleSave = () => {
    if (!selectedLeadId) {
      addToast("Please select a lead first", "error");
      return;
    }
    const subtotal = calculateTotal();
    const newEstimate: Estimate = {
       id: Date.now().toString(),
       leadId: selectedLeadId,
       name: estimateName,
       items,
       subtotal,
       tax: subtotal * 0.08,
       total: subtotal * 1.08,
       createdAt: new Date().toLocaleDateString(),
       signature: signature || undefined,
       status: signature ? 'Signed' : 'Draft'
    };
    onSaveEstimate(selectedLeadId, newEstimate);
    addToast("Estimate saved to project!", "success");
  };

  const handleOrderMaterials = () => {
      if(!selectedLeadId) {
          addToast("Please select a lead to attach this order to.", "error");
          return;
      }
      setShowOrderModal(true);
  };

  // Signature Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      setIsSigning(true);
      ctx.beginPath();
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      ctx.moveTo(offsetX, offsetY);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isSigning) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
  };
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
      if ('touches' in e) {
          const rect = canvas.getBoundingClientRect();
          return {
              offsetX: e.touches[0].clientX - rect.left,
              offsetY: e.touches[0].clientY - rect.top
          };
      } else {
          return {
              offsetX: (e as React.MouseEvent).nativeEvent.offsetX,
              offsetY: (e as React.MouseEvent).nativeEvent.offsetY
          };
      }
  };
  const stopDrawing = () => {
      setIsSigning(false);
      if (canvasRef.current) {
          setSignature(canvasRef.current.toDataURL());
      }
  };
  const clearSignature = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature(null);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsImporting(true);
          setTimeout(() => {
              setItems([
                  { description: 'Remove 3-tab shingle roofing - w/ felt', quantity: 24.33, unit: 'SQ', unitPrice: 65.42, total: 1591.67 },
                  { description: 'Laminated - comp. shingle rfg. - w/ felt', quantity: 27.00, unit: 'SQ', unitPrice: 245.10, total: 6617.70 },
                  { description: 'R&R Drip edge', quantity: 345, unit: 'LF', unitPrice: 2.15, total: 741.75 },
                  { description: 'R&R Flashing - pipe jack', quantity: 3, unit: 'EA', unitPrice: 45.00, total: 135.00 },
                  { description: 'Dumpster load - Approx. 30 yards', quantity: 1, unit: 'EA', unitPrice: 550.00, total: 550.00 },
              ]);
              setIsImporting(false);
              addToast("Successfully imported Xactimate scope", "success");
              setEstimateName("Imported Xactimate Scope");
              setMobileView('preview');
          }, 1500);
      }
  };

  return (
    <div className="flex flex-col h-full relative pb-16 lg:pb-0">
      
      {/* Mobile Toggle Buttons */}
      <div className="lg:hidden flex border-b border-slate-200 mb-4 sticky top-0 bg-[#F8FAFC] z-10 pt-2">
          <button 
             onClick={() => setMobileView('editor')}
             className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 ${mobileView === 'editor' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
          >
              <Edit size={16}/> Editor
          </button>
          <button 
             onClick={() => setMobileView('preview')}
             className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 ${mobileView === 'preview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
          >
              <Eye size={16}/> Preview ({items.length})
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
        
        {/* Input Panel */}
        <div className={`lg:col-span-4 space-y-4 h-full overflow-y-auto custom-scrollbar pr-2 ${mobileView === 'preview' ? 'hidden lg:block' : 'block'}`}>
            
            {/* Mode Switcher */}
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex">
                <button 
                    onClick={() => setActiveTab('manual')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'manual' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <PenTool size={16} /> Calculator
                </button>
                <button 
                    onClick={() => setActiveTab('satellite')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'satellite' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Satellite size={16} /> Map Measure
                </button>
            </div>

            {/* Satellite Measure Tool */}
            {activeTab === 'satellite' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in flex flex-col h-[600px]">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                        <Satellite className="text-indigo-600" size={20} />
                        Measurements
                    </h2>
                    
                    {/* Search / Lock Bar */}
                    <div className="flex gap-2 mb-4">
                         <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                value={measureAddress}
                                onChange={(e) => setMeasureAddress(e.target.value)}
                                placeholder="Enter Address..."
                                disabled={mapLocked}
                                onKeyDown={(e) => e.key === 'Enter' && getSolarData()}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                            />
                         </div>
                         <button 
                             onClick={() => { setMapLocked(!mapLocked); if(!mapLocked) getSolarData(); }}
                             className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${mapLocked ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}
                         >
                             {mapLocked ? 'Unlock' : 'Lock'}
                         </button>
                    </div>

                    {/* Solar Analysis Panel (If Data Available) */}
                    {solarData && mapLocked && (
                        <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-200 rounded-full text-amber-700">
                                    <Sun size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-amber-900 uppercase">Solar Potential</p>
                                    <p className="text-sm font-bold text-slate-800">{solarData.solarPotential}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500">{solarData.maxSunlightHours} hrs/yr</p>
                                <p className="text-xs text-emerald-600 font-bold">Grid Ready</p>
                            </div>
                        </div>
                    )}

                    {/* Tools Bar (Only when locked) */}
                    {mapLocked && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                             <button 
                                onClick={() => setMeasureTool('calibrate')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${measureTool === 'calibrate' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                             >
                                 <Ruler size={14}/> 1. Calibrate
                             </button>
                             <button 
                                onClick={() => setMeasureTool('draw')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${measureTool === 'draw' ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                             >
                                 <PenTool size={14}/> 2. Draw Area
                             </button>
                             {currentPoints.length > 2 && (
                                 <button onClick={completeShape} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600">
                                     <Check size={14}/> Finish Shape
                                 </button>
                             )}
                             <button onClick={() => { setFacets([]); setCurrentPoints([]); setCalibrationPoints([]); setCalibrationScale(null); }} className="px-2 py-1.5 text-slate-400 hover:text-red-500">
                                 <Trash2 size={16}/>
                             </button>
                        </div>
                    )}

                    {/* Map & Canvas Container */}
                    <div className="relative flex-1 bg-slate-100 rounded-xl overflow-hidden border border-slate-300">
                        {measureAddress && (
                             <iframe 
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                style={{border:0, pointerEvents: mapLocked ? 'none' : 'auto'}} 
                                src={`https://www.google.com/maps?q=${encodeURIComponent(measureAddress)}&t=k&z=21&output=embed`} 
                            ></iframe>
                        )}
                        
                        {/* Drawing Canvas Overlay */}
                        {mapLocked && (
                            <canvas 
                                ref={drawCanvasRef}
                                width={600}
                                height={400} // Ideally dynamic based on container
                                className={`absolute inset-0 w-full h-full z-10 ${measureTool !== 'none' ? 'cursor-crosshair' : ''}`}
                                onClick={handleCanvasClick}
                            />
                        )}

                        {/* Calibration Popup */}
                        {isCalibratingPopupOpen && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-xl shadow-xl z-20 w-64 border border-slate-200">
                                <h4 className="font-bold text-slate-800 mb-2">Set Scale</h4>
                                <p className="text-xs text-slate-500 mb-3">Enter the length of the line you just drew (in feet).</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={calibrationLengthInput} 
                                        onChange={e => setCalibrationLengthInput(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                        autoFocus
                                    />
                                    <button onClick={finishCalibration} className="bg-indigo-600 text-white px-3 rounded-lg font-bold text-sm">Set</button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Measurements List */}
                    <div className="mt-4 border-t border-slate-100 pt-2 h-32 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-100">
                                    <th className="py-1">Facet</th>
                                    <th className="py-1">Pitch</th>
                                    <th className="py-1 text-right">Area</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facets.map((f, i) => (
                                    <tr key={f.id} className="border-b border-slate-50">
                                        <td className="py-2 font-medium">Facet {i+1}</td>
                                        <td className="py-2">
                                            <select 
                                                value={f.pitch} 
                                                onChange={(e) => {
                                                    const updated = [...facets];
                                                    updated[i].pitch = parseInt(e.target.value);
                                                    setFacets(updated);
                                                }}
                                                className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 outline-none"
                                            >
                                                {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(p => (
                                                    <option key={p} value={p}>{p}/12</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 text-right font-bold">
                                            {Math.round(f.sqFt * getPitchMultiplier(f.pitch))} sqft
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-2 flex justify-between items-center bg-indigo-50 p-3 rounded-lg">
                        <span className="font-bold text-indigo-900">Total Area</span>
                        <span className="font-bold text-xl text-indigo-700">{getTotalMeasuredSqFt()} sqft</span>
                    </div>

                    <button 
                        onClick={applyMeasurementToCalculator}
                        disabled={facets.length === 0}
                        className="w-full mt-3 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Apply to Estimate
                    </button>
                </div>
            )}

            {/* Generator Card (Manual) */}
            {activeTab === 'manual' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <Sparkles className="text-indigo-600" size={24} />
                    Calculator Engine
                    </h2>
                    
                    <div className="space-y-5">
                    
                    {/* Tiers */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Quality Tier</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Good', 'Better', 'Best'].map(tier => (
                                <button
                                    key={tier}
                                    onClick={() => setSelectedTier(tier as EstimateTier)}
                                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${selectedTier === tier ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {tier}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Roof Specs</label>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Square Footage</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={sqFt}
                                        onChange={(e) => setSqFt(Number(e.target.value))}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    {facets.length > 0 && (
                                        <span title="Verified by Manual Measure" className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                                            <Satellite size={14} />
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Granular Pitch Selector */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Avg Pitch (Steepness)</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto grid grid-cols-4 gap-1">
                                    {Array.from({length: 19}, (_, i) => i).map(p => (
                                        <button 
                                            key={p}
                                            onClick={() => setDifficulty(p.toString())} // Using difficulty state to store integer pitch for now
                                            className={`py-1 text-xs font-medium rounded ${difficulty === p.toString() ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                                        >
                                            {p}/12
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Multiplier: {getPitchMultiplier(parseInt(difficulty) || 6).toFixed(3)}x
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">
                            <span>Waste Factor</span>
                            <span className="text-indigo-600">{wasteFactor}%</span>
                        </label>
                        <input 
                            type="range" 
                            min="0" 
                            max="30" 
                            step="5"
                            value={wasteFactor}
                            onChange={(e) => setWasteFactor(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>0% (Perfect)</span>
                            <span>10% (Std)</span>
                            <span>30% (Complex)</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" /> : <LayoutGrid size={18} />}
                        Build Material List
                    </button>
                    </div>
                </div>
            )}

            {/* Import Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-800 uppercase tracking-wide">
                    Import Source
                </h2>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50 transition-all"
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".esx,.pdf" onChange={handleImport} />
                    {isImporting ? (
                        <div className="flex flex-col items-center text-indigo-600">
                            <Loader2 className="animate-spin mb-2" size={24} />
                            <span className="text-xs font-bold">Parsing Xactimate File...</span>
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="text-slate-400 mb-2" size={32} />
                            <p className="text-sm font-medium text-slate-600">Upload Scope / ESX</p>
                            <p className="text-xs text-slate-400 mt-1">Drag & Drop supported</p>
                        </>
                    )}
                </div>
            </div>
            
            {/* Profit Toggle Card (Sales Polish) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Sales Mode
                    </h2>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={showProfit} onChange={() => setShowProfit(!showProfit)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span className="ml-3 text-sm font-medium text-slate-600">Show Profit</span>
                    </label>
                </div>
                
                {showProfit && items.length > 0 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                             <div className="flex justify-between mb-1">
                                 <span className="text-xs font-bold text-emerald-700 uppercase">Net Profit</span>
                                 <span className="text-sm font-bold text-emerald-800">${(calculateTotal() - calculateCost()).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                             </div>
                             <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full" style={{width: '35%'}}></div>
                             </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Est. Commission (10%)</span>
                            <span className="font-bold text-slate-800">${((calculateTotal() - calculateCost()) * commissionRate).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                )}
            </div>

        </div>

        {/* Preview Panel - Paper Effect */}
        <div className={`lg:col-span-8 bg-slate-100/50 rounded-2xl flex flex-col items-center justify-start p-2 md:p-6 overflow-auto custom-scrollbar ${mobileView === 'editor' ? 'hidden lg:flex' : 'flex'}`}>
            {/* Document Controls */}
            <div className="w-full max-w-3xl flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                <h3 className="font-bold text-slate-700">Document Preview</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                    {items.length > 0 && (
                        <>
                            <button onClick={handleOrderMaterials} className="flex-1 sm:flex-none p-2 bg-indigo-50 text-indigo-700 rounded-lg shadow-sm border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm font-bold">
                                <Truck size={18}/> <span className="sm:hidden">Order</span> <span className="hidden sm:inline">Order Materials</span>
                            </button>
                            <button onClick={() => window.print()} className="flex-1 sm:flex-none p-2 bg-white rounded-lg text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                <Printer size={18}/> <span className="sm:hidden">Print</span>
                            </button>
                            <button onClick={handleSave} className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                                <Save size={18} /> Save to CRM
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* The Paper */}
            <div className="bg-white w-full max-w-3xl min-h-[600px] md:min-h-[800px] shadow-xl shadow-slate-200 rounded-lg p-6 md:p-12 border border-slate-200 transition-all duration-500 ease-in-out print-content">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 py-32">
                        <FileCheck size={64} strokeWidth={1} />
                        <p className="text-lg font-medium">Estimate Preview</p>
                        <p className="text-sm max-w-xs text-center">Configure the details on the left and let Gemini generate a line-item quote for you.</p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between border-b-2 border-slate-800 pb-6 gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-indigo-700 font-bold text-2xl mb-1">
                                    <Sparkles size={24}/> RAFTER AI
                                </div>
                                <p className="text-slate-500 text-sm">123 Construction Way</p>
                                <p className="text-slate-500 text-sm">Builder City, TX 75001</p>
                            </div>
                            <div className="sm:text-right">
                                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">ESTIMATE</h1>
                                <p className="text-slate-500 mt-1">Date: {new Date().toLocaleDateString()}</p>
                                <p className="text-slate-500">ID: #EST-{Math.floor(Math.random()*1000)}</p>
                                <div className="mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold inline-block border border-indigo-100">
                                    {selectedTier} Option
                                </div>
                            </div>
                        </div>

                        {/* Client Info Placeholder */}
                        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 no-print">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Prepared For</label>
                                {selectedLeadId ? (
                                    <p className="font-semibold text-slate-800">{leads.find(l => l.id === selectedLeadId)?.name}</p>
                                ) : (
                                    <div className="mt-1">
                                        <select 
                                            value={selectedLeadId}
                                            onChange={(e) => setSelectedLeadId(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded p-2 text-sm outline-none"
                                        >
                                            <option value="">Select Client...</option>
                                            {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Project Name</label>
                                <input 
                                    value={estimateName} 
                                    onChange={e => setEstimateName(e.target.value)}
                                    className="w-full bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none text-slate-800 font-medium py-1"
                                />
                            </div>
                        </div>

                        {/* Line Items - Scrollable table container for mobile */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[500px]">
                                <thead className="text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 font-semibold w-1/2">Description</th>
                                        <th className="py-3 font-semibold text-center">Qty</th>
                                        <th className="py-3 font-semibold text-right">Rate</th>
                                        <th className="py-3 font-semibold text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-4 text-slate-800 font-medium pr-4">{item.description}</td>
                                            <td className="py-4 text-center text-slate-600 whitespace-nowrap">{item.quantity} {item.unit}</td>
                                            <td className="py-4 text-right text-slate-600">${item.unitPrice.toFixed(2)}</td>
                                            <td className="py-4 text-right font-bold text-slate-800">${item.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end pt-8">
                            <div className="w-full sm:w-64 space-y-3">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span>${calculateTotal().toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Tax (8.0%)</span>
                                    <span>${(calculateTotal() * 0.08).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-2xl font-bold text-slate-900 pt-4 border-t-2 border-slate-800">
                                    <span>Total</span>
                                    <span>${(calculateTotal() * 1.08).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Terms & Signature */}
                        <div className="pt-12 mt-12 border-t border-slate-100 page-break-avoid">
                            <h4 className="font-bold text-slate-700 mb-2">Terms & Acceptance</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-6">
                                By signing below, you agree to the terms outlined in this estimate. A deposit of 50% is required to schedule work. This estimate is valid for 30 days.
                            </p>
                            
                            <div className="flex flex-col w-full max-w-sm">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2">Customer Signature</label>
                                <div className="relative border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 h-32 w-full overflow-hidden hover:border-indigo-400 transition-colors touch-none">
                                    {signature ? (
                                        <img src={signature} alt="Signed" className="w-full h-full object-contain" />
                                    ) : (
                                        <canvas 
                                            ref={canvasRef}
                                            width={380}
                                            height={128}
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                            className="absolute inset-0 cursor-crosshair w-full h-full"
                                        />
                                    )}
                                    {!isSigning && !signature && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="text-slate-400 text-sm flex items-center gap-1"><PenTool size={14}/> Sign Here</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end mt-2 no-print">
                                    <button onClick={clearSignature} className="text-xs text-red-500 hover:underline">Clear Signature</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Material Order Modal */}
      {showOrderModal && selectedLeadId && (
          <MaterialOrderModal 
              items={items} 
              lead={leads.find(l => l.id === selectedLeadId)!} 
              onClose={() => setShowOrderModal(false)}
          />
      )}
    </div>
  );
};

export default Estimator;
