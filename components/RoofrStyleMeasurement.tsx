import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Undo2, Trash2, Tag, Layers, Grid3x3, Ruler, ChevronDown, ChevronUp, Info, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoofEdge, EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import CreditPurchaseModal from './CreditPurchaseModal';
import EdgeTypesGuide from './EdgeTypesGuide';

declare global { interface Window { google: any; } }

interface Point { lat: number; lng: number; }
interface RoofFacet { id: string; name: string; points: Point[]; polygon: any; areaSqFt: number; pitch?: string; }
interface RoofEdgeLine { id: string; facetId: string; points: [Point, Point]; edgeType: EdgeType; lengthFt: number; polyline: any; shared: boolean; }

interface RoofrStyleMeasurementProps {
  address: string;
  leadId?: string;
  initialLat?: number;
  initialLng?: number;
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

type WorkflowStep = 'drawing' | 'labeling' | 'review';

const RoofrStyleMeasurement: React.FC<RoofrStyleMeasurementProps> = ({ address, leadId, initialLat, initialLng, onSave, onCancel }) => {
  const [map, setMap] = useState<any>(null);
  const [facets, setFacets] = useState<RoofFacet[]>([]);
  const [edges, setEdges] = useState<RoofEdgeLine[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentMarkers, setCurrentMarkers] = useState<any[]>([]);
  const [currentPolyline, setCurrentPolyline] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType>('Eave');
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFacet, setSelectedFacet] = useState<string | null>(null);
  const [step, setStep] = useState<WorkflowStep>('drawing');

  const mapRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Sync refs
  useEffect(() => {
    isDrawingRef.current = isDrawing;
    currentPointsRef.current = currentPoints;
    if (map) map.setOptions({ draggableCursor: isDrawing ? 'crosshair' : 'default' });
  }, [isDrawing, currentPoints, map]);

  useEffect(() => {
    loadCredits();
    if (!googleApiKey) { setMapError('Google Maps API Key is missing'); setMapLoading(false); return; }

    const initMap = () => {
        if (map) return;
        if (initialLat && initialLng) { initializeMapWithCoords(initialLat, initialLng); }
        else { geocodeAndInitialize(); }
    };

    if (window.google && window.google.maps) { initMap(); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=geometry,places,drawing`;
    script.async = true; script.defer = true;
    script.addEventListener('load', initMap);
    document.head.appendChild(script);
  }, [initialLat, initialLng]);

  const loadCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
        if(userData) {
             const { data } = await supabase.from('measurement_credits').select('credits_remaining').eq('company_id', userData.company_id).maybeSingle();
             setCredits(data?.credits_remaining || 0);
        }
    }
  };

  const initializeMapWithCoords = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng }, zoom: 20, mapTypeId: 'satellite', tilt: 0,
        fullscreenControl: false, streetViewControl: false, mapTypeControl: false,
        draggableCursor: 'default'
    });
    window.google.maps.event.addListenerOnce(mapInstance, 'tilesloaded', () => setMapLoading(false));
    mapInstance.addListener('click', (e: any) => handleMapClick(e.latLng, mapInstance));
    setMap(mapInstance);
  };

  const geocodeAndInitialize = () => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: address }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            initializeMapWithCoords(loc.lat(), loc.lng());
        } else { setMapError('Address not found'); setMapLoading(false); }
    });
  };

  const handleMapClick = (latLng: any, mapInstance: any) => {
    if (!isDrawingRef.current) return;
    const point: Point = { lat: latLng.lat(), lng: latLng.lng() };
    const currentPts = currentPointsRef.current;

    if (currentPts.length > 0 && window.google.maps.geometry) {
        const first = currentPts[0];
        const dist = window.google.maps.geometry.spherical.computeDistanceBetween(new window.google.maps.LatLng(first.lat, first.lng), latLng);
        if (dist < 3 && currentPts.length >= 3) { completePolygon(mapInstance); return; }
    }

    const marker = new window.google.maps.Marker({
      position: latLng, map: mapInstance,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 }
    });
    setCurrentMarkers(prev => [...prev, marker]);
    const newPoints = [...currentPts, point];
    setCurrentPoints(newPoints);
    currentPointsRef.current = newPoints;
    
    if (currentPolyline) currentPolyline.setMap(null);
    if (newPoints.length > 1) {
        const line = new window.google.maps.Polyline({ path: newPoints, strokeColor: '#3b82f6', strokeWeight: 2, map: mapInstance });
        setCurrentPolyline(line);
    }
  };

  const completePolygon = (mapInstance: any) => {
    const points = currentPointsRef.current;
    if (points.length < 3) return;
    const facetId = `facet-${Date.now()}`;
    const polygon = new window.google.maps.Polygon({
      paths: points, strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#3b82f6', fillOpacity: 0.2, map: mapInstance
    });
    const areaSqFt = Math.round(window.google.maps.geometry.spherical.computeArea(points.map(p => new window.google.maps.LatLng(p.lat, p.lng))) * 10.7639);
    
    const newFacet: RoofFacet = { id: facetId, name: `Facet ${facets.length + 1}`, points: [...points], polygon, areaSqFt };
    polygon.addListener('click', () => setSelectedFacet(facetId));
    setFacets(prev => [...prev, newFacet]);
    createEdgesForFacet(newFacet, mapInstance);
    
    // Clear
    currentMarkers.forEach(m => m.setMap(null));
    if (currentPolyline) currentPolyline.setMap(null);
    setCurrentMarkers([]); setCurrentPoints([]); setCurrentPolyline(null); setIsDrawing(false);
  };

  const createEdgesForFacet = (facet: RoofFacet, mapInstance: any) => {
    const newEdges: RoofEdgeLine[] = [];
    for (let i = 0; i < facet.points.length; i++) {
      const p1 = facet.points[i];
      const p2 = facet.points[(i + 1) % facet.points.length];
      const lengthFt = calculateDistance(p1, p2);
      const edgeId = `edge-${Date.now()}-${i}`;
      
      const polyline = new window.google.maps.Polyline({
        path: [p1, p2], strokeColor: EDGE_TYPE_CONFIGS['Eave'].strokeColor, strokeOpacity: 1, strokeWeight: 4, clickable: true, map: mapInstance, zIndex: 100
      });
      
      polyline.addListener('click', () => handleEdgeClick(edgeId));
      newEdges.push({ id: edgeId, facetId: facet.id, points: [p1, p2], edgeType: 'Eave', lengthFt, polyline, shared: false });
    }
    setEdges(prev => [...prev, ...newEdges]);
  };

  const handleEdgeClick = (edgeId: string) => {
    // Only allow labeling in the labeling step
    if (step !== 'labeling') return;
    
    setEdges(prev => prev.map(edge => {
      if (edge.id === edgeId) {
        const config = EDGE_TYPE_CONFIGS[selectedEdgeType];
        edge.polyline.setOptions({ strokeColor: config.strokeColor });
        return { ...edge, edgeType: selectedEdgeType };
      }
      return edge;
    }));
  };

  const calculateDistance = (p1: Point, p2: Point) => {
    const R = 6371e3; const φ1 = p1.lat * Math.PI/180; const φ2 = p2.lat * Math.PI/180;
    const Δφ = (p2.lat-p1.lat) * Math.PI/180; const Δλ = (p2.lng-p1.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 3.28084;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userData } = await supabase.from('users').select('company_id').eq('id', user?.id).single();
        const totalArea = facets.reduce((sum, f) => sum + f.areaSqFt, 0);
        const edgeTotals: any = { Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0 };
        edges.forEach(e => edgeTotals[e.edgeType] += e.lengthFt);

        const { data, error } = await supabase.from('roof_measurements').insert({
            company_id: userData?.company_id, address, total_area_sqft: totalArea, ...{ ridge_length: edgeTotals.Ridge, hip_length: edgeTotals.Hip, valley_length: edgeTotals.Valley, rake_length: edgeTotals.Rake, eave_length: edgeTotals.Eave },
            segments: facets.map(f => ({ name: f.name, area_sqft: f.areaSqFt, geometry: f.points })), lead_id: leadId || null, status: 'Completed', measurement_type: 'Manual'
        }).select().single();
        
        if (error) throw error;
        await supabase.rpc('decrement_measurement_credits', { p_company_id: userData?.company_id });
        onSave(data);
    } catch(e) { console.error(e); alert('Save failed'); } finally { setSaving(false); }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-lg font-bold text-white">{address}</h2>
                 <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${step === 'drawing' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>1. Draw</span>
                    <ArrowRight size={14} className="text-slate-500"/>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${step === 'labeling' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>2. Label</span>
                    <ArrowRight size={14} className="text-slate-500"/>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${step === 'review' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>3. Review</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                 {step === 'drawing' && (
                    <>
                        <p className="text-sm text-blue-200 mr-4">Outline roof sections.</p>
                        {!isDrawing ? ( <button onClick={() => setIsDrawing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex gap-2"><Grid3x3 size={18} /> Draw Facet</button> ) : ( <button onClick={() => setIsDrawing(false)} className="px-4 py-2 bg-orange-600 text-white rounded-lg">Cancel</button> )}
                        <button onClick={() => { if(facets.length>0) setStep('labeling'); }} disabled={facets.length===0} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">Next: Label</button>
                    </>
                )}
                {step === 'labeling' && (
                    <>
                         <p className="text-sm text-blue-200 mr-4">Select type, then click lines.</p>
                         <button onClick={() => setStep('drawing')} className="px-3 py-2 bg-slate-700 text-white rounded-lg">Back</button>
                         <button onClick={() => setStep('review')} className="px-4 py-2 bg-green-600 text-white rounded-lg">Next: Review</button>
                    </>
                )}
                {step === 'review' && (
                     <>
                        <button onClick={() => setStep('labeling')} className="px-3 py-2 bg-slate-700 text-white rounded-lg">Back</button>
                        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg animate-pulse"><Save size={18} /> Purchase & Save</button>
                     </>
                )}
                <button onClick={onCancel} className="p-2 bg-slate-800 text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
         {showSidebar && (
            <div className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto p-4">
                 {step === 'labeling' ? (
                     <div>
                         <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Tag size={18} className="text-blue-400" /> Edge Types</h3>
                         <div className="space-y-2">
                            {Object.entries(EDGE_TYPE_CONFIGS).map(([type, config]) => (
                                <button key={type} onClick={() => setSelectedEdgeType(type as EdgeType)} className={`w-full p-3 rounded-lg border-2 transition-all text-left ${selectedEdgeType === type ? 'border-white bg-slate-700 shadow-lg' : 'border-slate-600 bg-slate-750'}`}>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.color }} /><div className="font-semibold text-white text-sm">{config.label}</div></div></button>
                            ))}
                        </div>
                     </div>
                 ) : (
                     <div className="text-white space-y-4">
                        <h3 className="font-bold">Summary</h3>
                        <p>Total Area: {facets.reduce((s,f)=>s+f.areaSqFt,0).toLocaleString()} sq ft</p>
                     </div>
                 )}
            </div>
         )}
         <div ref={mapRef} className="flex-1" />
         {mapLoading && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>}
      </div>
      {showCreditModal && <CreditPurchaseModal currentCredits={credits} onClose={()=>setShowCreditModal(false)} onPurchaseComplete={()=>{setShowCreditModal(false); loadCredits();}} />}
    </div>
  );
};

export default RoofrStyleMeasurement;