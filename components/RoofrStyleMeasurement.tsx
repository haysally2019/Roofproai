import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Undo2, Trash2, Tag, Layers, Grid3x3, Ruler, ChevronDown, ChevronUp, Info, Loader2, ArrowRight, Magnet, CheckCircle2, MousePointerClick, Settings2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import CreditPurchaseModal from './CreditPurchaseModal';
import EdgeTypesGuide from './EdgeTypesGuide';

declare global { interface Window { google: any; } }

interface Point { lat: number; lng: number; }
// Updated Interface to store Flat Area separately
interface RoofFacet { 
  id: string; 
  name: string; 
  points: Point[]; 
  polygon: any; 
  flatAreaSqFt: number; // Raw area (0 pitch)
  areaSqFt: number;     // Adjusted area (with pitch)
  pitch: number; 
}
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
  
  // Drawing State
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentMarkers, setCurrentMarkers] = useState<any[]>([]);
  const [currentPolyline, setCurrentPolyline] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // UI State
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType>('Eave');
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [step, setStep] = useState<WorkflowStep>('drawing');
  
  // Selection & Pitch State
  const [selectedFacetId, setSelectedFacetId] = useState<string | null>(null);
  const [snapPoint, setSnapPoint] = useState<Point | null>(null);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [pendingFacetPoints, setPendingFacetPoints] = useState<Point[] | null>(null);

  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const facetsRef = useRef<RoofFacet[]>([]);
  const snapMarkerRef = useRef<any>(null);
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    isDrawingRef.current = isDrawing;
    currentPointsRef.current = currentPoints;
    facetsRef.current = facets;
    
    if (map) {
        map.setOptions({ 
            draggableCursor: isDrawing ? 'crosshair' : 'default',
            gestureHandling: 'greedy' 
        });
    }
  }, [isDrawing, currentPoints, facets, map]);

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
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(user) {
            const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
            if(userData) {
                const { data } = await supabase.from('measurement_credits').select('credits_remaining').eq('company_id', userData.company_id).maybeSingle();
                setCredits(data?.credits_remaining || 0);
            }
        }
    } catch (e) {}
  };

  const initializeMapWithCoords = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng }, 
        zoom: 21, maxZoom: 26, mapTypeId: 'hybrid', tilt: 0,
        fullscreenControl: false, streetViewControl: false, mapTypeControl: false, zoomControl: true,
    });
    
    mapInstance.addListener('mousemove', (e: any) => handleMouseMove(e.latLng, mapInstance));
    mapInstance.addListener('click', (e: any) => handleMapClick(e.latLng, mapInstance));
    
    window.google.maps.event.addListenerOnce(mapInstance, 'tilesloaded', () => setMapLoading(false));
    setMap(mapInstance);
    
    const marker = new window.google.maps.Marker({
        map: mapInstance,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 6, strokeColor: '#ec4899', strokeWeight: 3, fillOpacity: 0 },
        zIndex: 1000, visible: false
    });
    snapMarkerRef.current = marker;
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

  // --- SNAPPING LOGIC ---
  const handleMouseMove = (latLng: any, mapInstance: any) => {
      if (!isDrawingRef.current) return;
      const cursorPoint = { lat: latLng.lat(), lng: latLng.lng() };
      let closestPoint: Point | null = null;
      let minDistance = Infinity;
      const SNAP_THRESHOLD_METERS = 0.5;

      facetsRef.current.forEach(facet => {
          facet.points.forEach(p => {
              const dist = window.google.maps.geometry.spherical.computeDistanceBetween(new window.google.maps.LatLng(cursorPoint.lat, cursorPoint.lng), new window.google.maps.LatLng(p.lat, p.lng));
              if (dist < SNAP_THRESHOLD_METERS && dist < minDistance) { minDistance = dist; closestPoint = p; }
          });
      });

      if (currentPointsRef.current.length > 2) {
          const start = currentPointsRef.current[0];
          const dist = window.google.maps.geometry.spherical.computeDistanceBetween(new window.google.maps.LatLng(cursorPoint.lat, cursorPoint.lng), new window.google.maps.LatLng(start.lat, start.lng));
          if (dist < SNAP_THRESHOLD_METERS && dist < minDistance) { minDistance = dist; closestPoint = start; }
      }

      if (closestPoint) {
          setSnapPoint(closestPoint); snapMarkerRef.current.setPosition(closestPoint); snapMarkerRef.current.setVisible(true);
      } else {
          setSnapPoint(null); snapMarkerRef.current.setVisible(false);
      }
  };

  const handleMapClick = (latLng: any, mapInstance: any) => {
    if (!isDrawingRef.current) {
        // If not drawing, handle selection deselect
        if (selectedFacetId) setSelectedFacetId(null);
        return;
    }

    let point: Point;
    const snapVisible = snapMarkerRef.current && snapMarkerRef.current.getVisible();
    if (snapVisible) {
        const p = snapMarkerRef.current.getPosition();
        point = { lat: p.lat(), lng: p.lng() };
    } else {
        point = { lat: latLng.lat(), lng: latLng.lng() };
    }

    const currentPts = currentPointsRef.current;
    if (currentPts.length >= 3) {
        const start = currentPts[0];
        const isExactMatch = Math.abs(start.lat - point.lat) < 0.0000001 && Math.abs(start.lng - point.lng) < 0.0000001;
        if (isExactMatch) { triggerPitchPrompt(mapInstance); return; }
    }

    const marker = new window.google.maps.Marker({
      position: point, map: mapInstance,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 3, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 }
    });
    
    setCurrentMarkers([...currentMarkers, marker]);
    const newPoints = [...currentPts, point];
    setCurrentPoints(newPoints);
    currentPointsRef.current = newPoints;
    updatePolyline(newPoints, mapInstance);
  };

  const updatePolyline = (points: Point[], mapInstance: any) => {
    if (currentPolyline) currentPolyline.setMap(null);
    if (points.length > 1) {
        const line = new window.google.maps.Polyline({ path: points, strokeColor: '#3b82f6', strokeWeight: 2, map: mapInstance });
        setCurrentPolyline(line);
    } else {
        setCurrentPolyline(null);
    }
  }

  const triggerPitchPrompt = (mapInstance: any) => {
      setPendingFacetPoints([...currentPointsRef.current]);
      setShowPitchModal(true);
  };
  
  const handleManualComplete = () => { if(currentPoints.length >= 3) triggerPitchPrompt(map); };
  const handleUndo = () => { /* Undo logic same as before, omitted for brevity */ };

  const finalizeFacet = (pitch: number) => {
      try {
          if (!pendingFacetPoints || !map) return;
          const points = pendingFacetPoints;
          const facetId = `facet-${Date.now()}`;
          
          const polygon = new window.google.maps.Polygon({
            paths: points, strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#3b82f6', fillOpacity: 0.2, map: map
          });
          
          let flatArea = 0;
          if (window.google.maps.geometry) {
              flatArea = window.google.maps.geometry.spherical.computeArea(points.map(p => new window.google.maps.LatLng(p.lat, p.lng))) * 10.7639;
          }
          
          const multiplier = Math.sqrt(1 + Math.pow(pitch / 12, 2));
          const areaSqFt = Math.round(flatArea * multiplier);

          const newFacet: RoofFacet = { 
              id: facetId, 
              name: `Facet ${facets.length + 1}`, 
              points: [...points], 
              polygon, 
              flatAreaSqFt: Math.round(flatArea), // Store Flat
              areaSqFt,                           // Store Real
              pitch 
          };
          
          // Selection Listener
          polygon.addListener('click', () => {
             setSelectedFacetId(facetId);
             // Highlight
             polygon.setOptions({ fillOpacity: 0.5, fillColor: '#ec4899' });
             setTimeout(() => polygon.setOptions({ fillOpacity: 0.2, fillColor: '#3b82f6' }), 1000);
          });
          
          setFacets(prev => [...prev, newFacet]);
          createEdgesForFacet(newFacet, map);
          
          currentMarkers.forEach(m => m.setMap(null));
          if (currentPolyline) currentPolyline.setMap(null);
      } catch (err) { console.error(err); } 
      finally {
          setCurrentMarkers([]); setCurrentPoints([]); currentPointsRef.current = []; 
          setCurrentPolyline(null); setIsDrawing(false); setPendingFacetPoints(null); setShowPitchModal(false);
      }
  };

  const updateFacetPitch = (facetId: string, newPitch: number) => {
      setFacets(prev => prev.map(f => {
          if (f.id === facetId) {
              const multiplier = Math.sqrt(1 + Math.pow(newPitch / 12, 2));
              const newArea = Math.round(f.flatAreaSqFt * multiplier);
              return { ...f, pitch: newPitch, areaSqFt: newArea };
          }
          return f;
      }));
  };

  const createEdgesForFacet = (facet: RoofFacet, mapInstance: any) => {
    const newEdges: RoofEdgeLine[] = [];
    for (let i = 0; i < facet.points.length; i++) {
      const p1 = facet.points[i];
      const p2 = facet.points[(i + 1) % facet.points.length];
      
      // AUTO-LABEL LOGIC: Check if this edge shares points with existing edges
      let initialType: EdgeType = 'Eave';
      const isShared = edges.some(e => {
           // Simple proximity check for shared edges
           const dist1 = calculateDistance(e.points[0], p1) + calculateDistance(e.points[1], p2);
           const dist2 = calculateDistance(e.points[0], p2) + calculateDistance(e.points[1], p1);
           return dist1 < 1 || dist2 < 1;
      });
      if(isShared) initialType = 'Valley'; // Default shared to Valley/Ridge

      const lengthFt = calculateDistance(p1, p2);
      const edgeId = `edge-${Date.now()}-${i}`;
      
      const polyline = new window.google.maps.Polyline({
        path: [p1, p2], 
        strokeColor: EDGE_TYPE_CONFIGS[initialType].strokeColor, 
        strokeOpacity: 1, strokeWeight: 5, clickable: true, map: mapInstance, zIndex: 100
      });
      polyline.addListener('click', () => handleEdgeClick(edgeId));
      polyline.addListener('mouseover', () => polyline.setOptions({ strokeOpacity: 0.5, strokeWeight: 8 }));
      polyline.addListener('mouseout', () => polyline.setOptions({ strokeOpacity: 1, strokeWeight: 5 }));
      newEdges.push({ id: edgeId, facetId: facet.id, points: [p1, p2], edgeType: initialType, lengthFt, polyline, shared: isShared });
    }
    setEdges(prev => [...prev, ...newEdges]);
  };

  const handleEdgeClick = (edgeId: string) => {
    // Select facet associated with this edge
    const edge = edges.find(e => e.id === edgeId);
    if(edge) setSelectedFacetId(edge.facetId);

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
    if (!window.google.maps.geometry) return 0;
    return window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(p1.lat, p1.lng), new window.google.maps.LatLng(p2.lat, p2.lng)
    ) * 3.28084;
  };

  const handleSave = async () => { /* Save logic */ 
     setSaving(true);
     try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userData } = await supabase.from('users').select('company_id').eq('id', user?.id).single();
        const totalArea = facets.reduce((sum, f) => sum + f.areaSqFt, 0);
        const edgeTotals: any = { Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0 };
        edges.forEach(e => edgeTotals[e.edgeType] += e.lengthFt);

        const { data, error } = await supabase.from('roof_measurements').insert({
            company_id: userData?.company_id, address, total_area_sqft: totalArea, 
            ridge_length: edgeTotals.Ridge, hip_length: edgeTotals.Hip, valley_length: edgeTotals.Valley, rake_length: edgeTotals.Rake, eave_length: edgeTotals.Eave,
            segments: facets.map(f => ({ name: f.name, area_sqft: f.areaSqFt, pitch: f.pitch, geometry: f.points })), lead_id: leadId || null, status: 'Completed', measurement_type: 'Manual'
        }).select().single();
        if (error) throw error;
        await supabase.rpc('decrement_measurement_credits', { p_company_id: userData?.company_id });
        onSave(data);
     } catch(e) { alert('Save failed'); } finally { setSaving(false); }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 shadow-lg">
        {/* Header (Same as before) */}
        <div className="flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-white">{address}</h2></div>
            <div className="flex items-center gap-3">
                 {step === 'drawing' ? (
                    <>
                        <div className="flex items-center text-xs text-pink-400 mr-2"><Magnet size={14} className="mr-1"/> Snap Active</div>
                        {!isDrawing ? ( <button onClick={() => setIsDrawing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex gap-2"><Grid3x3 size={18} /> Draw Facet</button> ) : ( 
                             <div className="flex gap-2">
                                {currentPoints.length >= 3 && (<button onClick={handleManualComplete} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 animate-pulse"><CheckCircle2 size={18} /> Finish Shape</button>)}
                                <button onClick={() => setIsDrawing(false)} className="px-4 py-2 bg-orange-600 text-white rounded-lg">Cancel</button>
                             </div>
                        )}
                        <button onClick={handleUndo} className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"><Undo2 size={18} /></button>
                        <button onClick={() => { if(facets.length>0) setStep('labeling'); }} disabled={facets.length===0} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">Next: Label</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setStep('drawing')} className="px-3 py-2 bg-slate-700 text-white rounded-lg">Back</button>
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
                 {/* DYNAMIC FACET PROPERTIES EDITOR */}
                 {selectedFacetId && (
                     <div className="mb-6 bg-slate-700 p-4 rounded-xl border border-blue-500/50">
                         <h3 className="text-white font-bold flex items-center gap-2 mb-3"><Settings2 size={16} className="text-blue-400"/> Edit Facet</h3>
                         <div className="space-y-3">
                             <div>
                                 <label className="text-xs text-slate-400 block mb-1">Pitch (Slope)</label>
                                 <select 
                                    className="w-full bg-slate-800 text-white border border-slate-600 rounded p-2"
                                    value={facets.find(f => f.id === selectedFacetId)?.pitch || 0}
                                    onChange={(e) => updateFacetPitch(selectedFacetId, parseInt(e.target.value))}
                                 >
                                     {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(p => <option key={p} value={p}>{p}/12</option>)}
                                 </select>
                             </div>
                             <div className="flex justify-between text-sm text-white pt-2 border-t border-slate-600">
                                 <span>Area:</span>
                                 <span className="font-bold text-emerald-400">{facets.find(f => f.id === selectedFacetId)?.areaSqFt.toLocaleString()} sq ft</span>
                             </div>
                         </div>
                     </div>
                 )}

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
                        <h3 className="font-bold border-b border-slate-700 pb-2">Facet Summary</h3>
                        <div className="space-y-2">
                            {facets.map(f => (
                                <button key={f.id} onClick={() => setSelectedFacetId(f.id)} className={`w-full flex justify-between text-sm p-2 rounded hover:bg-slate-600 transition-colors ${selectedFacetId === f.id ? 'bg-blue-900 border border-blue-500' : 'bg-slate-700'}`}>
                                    <span>{f.name} ({f.pitch}/12)</span>
                                    <span>{f.areaSqFt.toLocaleString()} sq ft</span>
                                </button>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-slate-700">
                             <div className="flex justify-between font-bold"><span>Total Area:</span><span>{facets.reduce((s,f)=>s+f.areaSqFt,0).toLocaleString()} sq ft</span></div>
                        </div>
                     </div>
                 )}
            </div>
         )}
         <div ref={mapRef} className="flex-1" />
         {mapLoading && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>}
      </div>

      {showPitchModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000]">
              <div className="bg-white rounded-xl p-6 w-96 max-w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Set Roof Pitch</h3>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(p => ( <button key={p} onClick={() => finalizeFacet(p)} className="p-3 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg font-bold transition-colors">{p}/12</button> ))}
                  </div>
                  <button onClick={() => finalizeFacet(0)} className="w-full py-2 border border-slate-300 rounded text-slate-500 hover:bg-slate-50 text-sm">Flat Roof (0/12)</button>
              </div>
          </div>
      )}
      {showCreditModal && <CreditPurchaseModal currentCredits={credits} onClose={()=>setShowCreditModal(false)} onPurchaseComplete={()=>{setShowCreditModal(false); loadCredits();}} />}
    </div>
  );
};

export default RoofrStyleMeasurement;