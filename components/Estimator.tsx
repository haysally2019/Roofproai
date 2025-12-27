import React, { useState, useEffect, useRef } from 'react';
import { EstimateItem, Lead, Estimate, EstimateTier } from '../types';
import {
  Sparkles, Save, Calculator, RotateCcw,
  PenTool, Satellite, FileText, Truck, AlertTriangle, Scan, Crosshair,
  Eye, EyeOff, Search, Download
} from 'lucide-react';
import { useStore } from '../lib/store';
import MaterialOrderModal from './MaterialOrderModal';
import { generateSmartEstimate } from '../services/geminiService';
import { EstimateTemplate } from './EstimateTemplate';
import { generateEstimatePDF } from '../lib/pdfGenerator';

// --- Internal Error Boundary ---
class EstimatorErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: string}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error: error.toString() }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-200 m-4">
          <h3 className="font-bold text-lg mb-2">Estimator Crashed</h3>
          <p className="font-mono text-sm">{this.state.error}</p>
          <p className="text-xs text-slate-500 mt-4">Check your Google Maps API Key in .env</p>
        </div>
      );
    }
    return this.props.children;
  }
}

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

const getPitchFactor = (rise: number) => Math.sqrt(1 + Math.pow(rise / 12, 2));

const EstimatorContent: React.FC<EstimatorProps> = ({ leads, onSaveEstimate }) => {
  const { addToast, priceBook, companies, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<'calculator' | 'map'>('map');
  const [viewMode, setViewMode] = useState<'proposal' | 'materials'>('proposal');

  // Data State
  const [totalSurfaceArea, setTotalSurfaceArea] = useState<number>(0);
  const [globalPitch, setGlobalPitch] = useState<number>(6);
  const [wasteFactor, setWasteFactor] = useState<number>(10);
  const [selectedTier, setSelectedTier] = useState<EstimateTier>('Better');
  const [measurementSource, setMeasurementSource] = useState<'api' | 'manual'>('manual');
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [materialList, setMaterialList] = useState<EstimateItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [estimateName, setEstimateName] = useState<string>("Roof Replacement Proposal");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [drawingManager, setDrawingManager] = useState<any>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [highContrast, setHighContrast] = useState(false);
  const [staticImageUrl, setStaticImageUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Signature
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  // --- 1. SAFE SCRIPT LOADING ---
  useEffect(() => {
    if (!apiKey) {
        setMapError("API Key missing. Check .env file.");
        return;
    }

    const scriptId = 'google-maps-script';
    
    const onScriptLoad = () => {
        // Double check safety before init
        if (!window.google?.maps) {
            setMapError("Google Maps loaded but API objects are missing. Check API Key restrictions.");
            return;
        }
        initMap();
    };

    if (window.google?.maps) {
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
        script.addEventListener('error', () => setMapError("Network error loading Maps API."));
        document.head.appendChild(script);
    } else {
        const script = document.getElementById(scriptId);
        script?.addEventListener('load', onScriptLoad);
    }
  }, [apiKey]);

  const initMap = () => {
    // CRITICAL FIX: Check window.google.maps, not just window.google
    if (!mapRef.current || !window.google?.maps) return;

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

        window.google.maps.event.addListener(manager, 'overlaycomplete', (event: any) => {
            if (event.type === 'polygon') {
                const newPoly = event.overlay;
                const areaMeters = window.google.maps.geometry.spherical.computeArea(newPoly.getPath());
                const areaSqFt = Math.round(areaMeters * 10.7639);
                
                setTotalSurfaceArea(prev => prev + areaSqFt);
                setPolygons(prev => [...prev, newPoly]);
                
                manager.setDrawingMode(null);
                setMeasurementSource('manual');
            }
        });

        if (searchInputRef.current) {
            const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, { types: ['address'] });
            autocomplete.bindTo('bounds', map);
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.geometry?.location) return;

                if (place.geometry.viewport) map.fitBounds(place.geometry.viewport);
                else { map.setCenter(place.geometry.location); map.setZoom(20); }
                
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                fetchRoofData(lat, lng);
                setStaticImageUrl(`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=400x400&maptype=satellite&key=${apiKey}`);
            });
        }
    } catch (err: any) {
        console.error(err);
        setMapError("Map Crash: " + err.message);
    }
  };

  const fetchRoofData = async (lat?: number, lng?: number) => {
      const targetLat = lat || mapCenter?.lat;
      const targetLng = lng || mapCenter?.lng;

      if (!targetLat || !targetLng || !apiKey) {
          if (!lat) addToast("Please center map first.", "error");
          return;
      }

      setAnalyzing(true);
      try {
          const response = await fetch(
              `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${targetLat}&location.longitude=${targetLng}&requiredQuality=HIGH&key=${apiKey}`
          );

          if (!response.ok) {
              if (response.status === 404) {
                  addToast("No 3D data here. Switched to Manual Mode.", "info");
                  if (drawingManager) drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                  return;
              }
              throw new Error("API Error");
          }

          const data = await response.json();
          if (data.solarPotential?.wholeRoofStats) {
              const stats = data.solarPotential.wholeRoofStats;
              const areaSqFt = Math.round(stats.areaMeters2 * 10.7639);
              
              polygons.forEach(p => p.setMap(null));
              setPolygons([]);
              setMeasurementSource('api');
              setTotalSurfaceArea(areaSqFt);
              addToast(`3D Model Found: ${areaSqFt.toLocaleString()} sqft`, "success");
          }
      } catch (error) {
          addToast("Could not fetch 3D data.", "error");
      } finally {
          setAnalyzing(false);
      }
  };

  const calculateEstimate = () => {
      if (totalSurfaceArea <= 0) {
          addToast("Area is 0. Please measure first.", "error");
          return;
      }
      const wasteMult = 1 + (wasteFactor / 100);
      const billableSqFt = totalSurfaceArea * wasteMult;
      const squares = Math.ceil(billableSqFt / 100);
      generateLineItems(billableSqFt, squares);
      setActiveTab('calculator');
  };

  // --- UPDATED LOGIC: USE PRICE BOOK ---
  const generateLineItems = (sqFt: number, squares: number) => {
      // Helper to find price from loaded Price Book
      const findPrice = (search: string, defaultPrice: number) => {
          const item = priceBook.find(i => i.name.toLowerCase().includes(search.toLowerCase()));
          return item ? item.price : defaultPrice;
      };

      let pricePerSq = findPrice('Shingle Install', 380);
      const tearOffPrice = findPrice('Tear-off', 95);
      const iceWaterPrice = findPrice('Ice & Water', 2.50);
      const mobPrice = findPrice('Mobilization', 450);
      const flashPrice = findPrice('Flashing', 950);

      // Adjust for Tier
      if (selectedTier === 'Better') pricePerSq *= 1.15;
      if (selectedTier === 'Best') pricePerSq *= 1.35;
      
      // Adjust for Pitch
      if (globalPitch > 7) pricePerSq += 25;

      setItems([
          { description: "Mobilization & Safety", quantity: 1, unit: 'LS', unitPrice: mobPrice, total: mobPrice },
          { description: "Tear-off & Disposal", quantity: squares, unit: 'SQ', unitPrice: tearOffPrice, total: squares * tearOffPrice },
          { description: `Install ${selectedTier} System`, quantity: squares, unit: 'SQ', unitPrice: (pricePerSq - tearOffPrice), total: squares * (pricePerSq - tearOffPrice) },
          { description: "Ice & Water Shield Upgrade", quantity: Math.ceil(sqFt * 0.15), unit: 'SF', unitPrice: iceWaterPrice, total: Math.ceil(sqFt * 0.15) * iceWaterPrice },
          { description: "Flashings & Ventilation", quantity: 1, unit: 'LS', unitPrice: flashPrice, total: flashPrice },
      ]);
      setMaterialList([
          { description: `${selectedTier} Shingles`, quantity: squares * 3, unit: 'BDL', unitPrice: 38.00, total: squares * 3 * 38.00 },
      ]);
  };

  // --- NEW: AI GENERATOR ---
  const handleAiEstimate = async () => {
      if(totalSurfaceArea === 0) {
          addToast("Please measure the roof first", "error");
          return;
      }
      setIsAiGenerating(true);
      try {
          const aiItems = await generateSmartEstimate(
              'Asphalt Shingle', 
              totalSurfaceArea, 
              globalPitch > 8 ? 'Steep' : 'Walkable', 
              `Waste factor: ${wasteFactor}%. Tier: ${selectedTier}. Use ${selectedTier} shingles.`
          );
          if(aiItems && aiItems.length > 0) {
              setItems(aiItems);
              setActiveTab('calculator');
              addToast("AI generated comprehensive scope!", "success");
          } else {
              throw new Error("AI returned empty scope");
          }
      } catch (e) {
          addToast("AI Generation failed. Reverting to standard calc.", "error");
          calculateEstimate();
      } finally {
          setIsAiGenerating(false);
      }
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

  const handleDownloadPDF = async () => {
    if (!selectedLeadId || items.length === 0) {
      addToast("No estimate to download", "error");
      return;
    }

    const lead = leads.find(l => l.id === selectedLeadId);
    const company = companies.find(c => c.id === currentUser?.companyId);

    if (!lead || !company) {
      addToast("Missing lead or company information", "error");
      return;
    }

    setIsDownloadingPDF(true);
    try {
      const total = calculateTotal(items);
      const tempEstimate: Estimate = {
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

      if (pdfTemplateRef.current) {
        const fileName = `${estimateName.replace(/\s+/g, '_')}_${lead.name.replace(/\s+/g, '_')}.pdf`;
        await generateEstimatePDF(pdfTemplateRef.current, fileName);
        addToast("PDF downloaded successfully", "success");
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      addToast("Failed to generate PDF", "error");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative isolate">
      {/* HEADER */}
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
              <button
                onClick={handleDownloadPDF}
                disabled={items.length === 0 || isDownloadingPDF}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Download size={18}/> {isDownloadingPDF ? 'Generating...' : 'PDF'}
              </button>
              <button onClick={handleSave} disabled={items.length === 0} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  <Save size={18}/> Save
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative z-0">
          
          {/* LEFT PANEL */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4 shrink-0 h-full relative z-0">
              {activeTab === 'map' ? (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-full relative z-0">
                      {mapError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">{mapError}</div>}

                      <div className="relative mb-3">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                          <input ref={searchInputRef} placeholder="Search Address..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"/>
                      </div>
                      
                      <div className="relative flex-1 bg-slate-100 rounded-lg border border-slate-200 min-h-[400px] mb-3 overflow-hidden group">
                          <div 
                            ref={mapRef} 
                            className="absolute inset-0 w-full h-full z-0 transition-[filter] duration-300"
                            style={{ filter: highContrast ? 'contrast(1.4) brightness(1.1) saturate(0.8)' : 'none' }}
                          ></div>
                          <div className="absolute top-2 right-2 z-[5]">
                              <button onClick={() => setHighContrast(!highContrast)} className="p-2 bg-white rounded shadow text-slate-600 hover:text-indigo-600">
                                  {highContrast ? <EyeOff size={16}/> : <Eye size={16}/>}
                              </button>
                          </div>
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5] opacity-60">
                              <Crosshair size={32} className="text-white drop-shadow-md" strokeWidth={1.5} />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                          <button onClick={() => fetchRoofData()} disabled={analyzing || !mapCenter} className="py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs flex justify-center items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                              {analyzing ? <span className="animate-spin">...</span> : <Scan size={14}/>} Auto-Measure
                          </button>
                          <button onClick={() => { if(drawingManager) { drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON); } }} className="py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-bold text-xs flex justify-center items-center gap-2 hover:bg-slate-50">
                              <PenTool size={14}/> Manual Trace
                          </button>
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center mb-2">
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Total Area</p>
                              <p className="text-2xl font-extrabold text-slate-800">{totalSurfaceArea.toLocaleString()} <span className="text-sm font-normal text-slate-500">sqft</span></p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs font-bold text-slate-400 uppercase">Mode</p>
                              <span className="text-sm font-bold text-indigo-600">{measurementSource === 'api' ? '3D Auto' : 'Manual'}</span>
                          </div>
                      </div>

                      <div className="flex gap-2">
                          <button onClick={calculateEstimate} disabled={totalSurfaceArea === 0} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                              <Calculator size={18}/> Estimate
                          </button>
                          <button onClick={handleAiEstimate} disabled={totalSurfaceArea === 0 || isAiGenerating} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                              {isAiGenerating ? <span className="animate-spin">✨</span> : <Sparkles size={18}/>} AI Scope
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Calculator size={20} className="text-indigo-600"/> Config</h2>
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">System Tier</label>
                              <div className="grid grid-cols-3 gap-2 mt-1">
                                  {['Good', 'Better', 'Best'].map(t => (
                                      <button key={t} onClick={() => setSelectedTier(t as EstimateTier)} className={`py-2 text-xs font-bold rounded border ${selectedTier === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>{t}</button>
                                  ))}
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Waste %</label>
                                  <input type="number" value={wasteFactor} onChange={e => setWasteFactor(Number(e.target.value))} className="w-full p-2 border rounded font-mono mt-1"/>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Pitch</label>
                                  <input type="number" value={globalPitch} onChange={e => setGlobalPitch(Number(e.target.value))} className="w-full p-2 border rounded font-mono mt-1"/>
                              </div>
                          </div>
                          <button onClick={calculateEstimate} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md">Refresh Proposal</button>
                      </div>
                  </div>
              )}
              
              {staticImageUrl && (
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">Reference</p>
                      <img src={staticImageUrl} alt="Reference" className="w-full h-40 object-cover rounded-lg" />
                  </div>
              )}
          </div>

          {/* RIGHT PANEL (Preview) */}
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
                      <div className="space-y-6 animate-fade-in">
                          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-6">
                              <div>
                                  <h1 className="text-3xl font-extrabold text-slate-900 mb-1">{viewMode === 'proposal' ? estimateName : 'Material Order'}</h1>
                                  <p className="text-slate-600 text-sm">Prepared for {leads.find(l => l.id === selectedLeadId)?.name || 'Customer'}</p>
                              </div>
                              <div className="text-right">
                                  <p className="font-bold text-slate-900 text-lg">{companies.find(c => c.id === currentUser?.companyId)?.name || 'Rafter AI'}</p>
                                  <p className="text-slate-500 text-xs">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                              </div>
                          </div>

                          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Project Address</p>
                                      <p className="text-slate-800">{leads.find(l => l.id === selectedLeadId)?.address || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Status</p>
                                      <p className="text-slate-800">{signature ? 'Signed' : 'Draft'}</p>
                                  </div>
                              </div>
                          </div>

                          <div>
                              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Scope of Work</h3>
                              <table className="w-full text-sm border-collapse">
                                  <thead className="bg-slate-900 text-white">
                                      <tr>
                                          <th className="text-left py-3 px-4 font-semibold">Description</th>
                                          <th className="text-center py-3 px-4 font-semibold">Qty</th>
                                          <th className="text-center py-3 px-4 font-semibold">Unit</th>
                                          <th className="text-right py-3 px-4 font-semibold">Rate</th>
                                          <th className="text-right py-3 px-4 font-semibold">Amount</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {(viewMode === 'proposal' ? items : materialList).map((item, i) => (
                                          <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                              <td className="py-3 px-4 text-slate-800">{item.description}</td>
                                              <td className="py-3 px-4 text-center text-slate-700">{item.quantity}</td>
                                              <td className="py-3 px-4 text-center text-slate-700 uppercase text-xs">{item.unit}</td>
                                              <td className="py-3 px-4 text-right text-slate-700">${item.unitPrice.toFixed(2)}</td>
                                              <td className="py-3 px-4 text-right font-bold text-slate-900">${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>

                          <div className="flex justify-end pt-4">
                              <div className="w-72 space-y-2">
                                  <div className="flex justify-between py-2 border-b border-slate-200">
                                      <span className="text-slate-600">Subtotal:</span>
                                      <span className="font-semibold text-slate-900">${calculateTotal(viewMode === 'proposal' ? items : materialList).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                  </div>
                                  <div className="flex justify-between py-2 border-b border-slate-200">
                                      <span className="text-slate-600">Tax:</span>
                                      <span className="font-semibold text-slate-900">$0.00</span>
                                  </div>
                                  <div className="flex justify-between py-3 bg-slate-900 text-white px-4 rounded">
                                      <span className="font-bold text-lg">Total:</span>
                                      <span className="font-bold text-xl">${calculateTotal(viewMode === 'proposal' ? items : materialList).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                  </div>
                              </div>
                          </div>

                          {viewMode === 'proposal' && (
                              <div className="mt-8 pt-6 border-t border-slate-300">
                                  <p className="text-xs text-slate-500 uppercase font-bold mb-2">Customer Authorization</p>
                                  <div className="border-2 border-dashed border-slate-300 rounded h-24 relative bg-slate-50 hover:bg-white transition-colors" onMouseDown={startSign} onMouseMove={drawSign} onMouseUp={() => setIsSigning(false)} onMouseLeave={() => setIsSigning(false)}>
                                      {!signature && <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold uppercase pointer-events-none text-sm">Sign Here</div>}
                                      <canvas ref={signCanvasRef} width={600} height={96} className="w-full h-full cursor-crosshair relative z-10"/>
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300">
                          <RotateCcw size={48} className="mb-4 opacity-50"/>
                          <p className="font-medium">Ready to measure</p>
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

      {/* Hidden PDF Template for Generation */}
      <div className="fixed -left-[9999px] top-0">
        {selectedLeadId && items.length > 0 && (() => {
          const lead = leads.find(l => l.id === selectedLeadId);
          const company = companies.find(c => c.id === currentUser?.companyId);
          if (!lead || !company) return null;

          const total = calculateTotal(items);
          const tempEstimate: Estimate = {
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

          return <EstimateTemplate ref={pdfTemplateRef} estimate={tempEstimate} lead={lead} company={company} />;
        })()}
      </div>
    </div>
  );
};

// Wrap the actual component in the Error Boundary
const Estimator: React.FC<EstimatorProps> = (props) => (
  <EstimatorErrorBoundary>
    <EstimatorContent {...props} />
  </EstimatorErrorBoundary>
);

export default Estimator;