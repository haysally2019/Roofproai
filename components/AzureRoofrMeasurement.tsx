import React, { useState, useEffect, useRef } from 'react';
import { Save, X, Undo2, Trash2, Tag, Layers, Grid3x3, Ruler, ChevronDown, ChevronUp, Info, AlertCircle, Loader2, ArrowRight, Magnet, CheckCircle2 } from 'lucide-react';
import * as atlas from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.min.css';
import { supabase } from '../lib/supabase';
import { EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import CreditPurchaseModal from './CreditPurchaseModal';
import EdgeTypesGuide from './EdgeTypesGuide';

interface Point { lat: number; lng: number; }
interface RoofFacet { id: string; name: string; points: Point[]; areaSqFt: number; pitch: number; }
interface RoofEdgeLine { id: string; facetId: string; points: [Point, Point]; edgeType: EdgeType; lengthFt: number; }

interface AzureRoofrMeasurementProps {
  address: string; leadId?: string; mapProvider?: 'satellite'; initialLat?: number; initialLng?: number;
  onSave: (measurement: any) => void; onCancel: () => void;
}

type WorkflowStep = 'drawing' | 'labeling' | 'review';

const AzureRoofrMeasurement: React.FC<AzureRoofrMeasurementProps> = ({ address, leadId, initialLat, initialLng, onSave, onCancel }) => {
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [datasource, setDatasource] = useState<atlas.source.DataSource | null>(null);
  const [facets, setFacets] = useState<RoofFacet[]>([]);
  const [edges, setEdges] = useState<RoofEdgeLine[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType>('Eave');
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WorkflowStep>('drawing');
  
  // Pitch & Snapping State
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [pendingFacetPoints, setPendingFacetPoints] = useState<Point[] | null>(null);
  const [snapPoint, setSnapPoint] = useState<Point | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const stepRef = useRef<WorkflowStep>('drawing');
  const facetsRef = useRef<RoofFacet[]>([]);
  const azureApiKey = import.meta.env.VITE_AZURE_MAPS_KEY;

  useEffect(() => {
    isDrawingRef.current = isDrawing;
    currentPointsRef.current = currentPoints;
    stepRef.current = step;
    facetsRef.current = facets;
  }, [isDrawing, currentPoints, step, facets]);

  useEffect(() => {
    loadCredits();
    if (!azureApiKey) { setMapError("Azure Maps API Key is missing"); setLoading(false); return; }

    const initMap = async () => {
      if (!mapRef.current) return;
      let center = [-96.7970, 32.7767];
      if (initialLat && initialLng) { center = [initialLng, initialLat]; }
      else {
          const res = await fetch(`https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureApiKey}&query=${encodeURIComponent(address)}`);
          const data = await res.json();
          if (data.results && data.results.length > 0) center = [data.results[0].position.lon, data.results[0].position.lat];
      }

      const mapInstance = new atlas.Map(mapRef.current, { center, zoom: 21, style: 'satellite_road_labels', authOptions: { authType: atlas.AuthenticationType.subscriptionKey, subscriptionKey: azureApiKey } });

      mapInstance.events.add('ready', () => {
          const source = new atlas.source.DataSource();
          mapInstance.sources.add(source);
          setDatasource(source);

          // Layers
          const polyLayer = new atlas.layer.PolygonLayer(source, undefined, { fillColor: 'rgba(59, 130, 246, 0.4)', fillOpacity: 0.5 });
          const lineLayer = new atlas.layer.LineLayer(source, undefined, { strokeColor: ['get', 'color'], strokeWidth: 5 });
          const drawPointLayer = new atlas.layer.BubbleLayer(source, undefined, { radius: 5, color: 'white', strokeColor: '#3b82f6', strokeWidth: 2, filter: ['==', ['get', 'type'], 'drawing_point'] });
          const drawLineLayer = new atlas.layer.LineLayer(source, undefined, { strokeColor: '#3b82f6', strokeWidth: 2, filter: ['==', ['get', 'type'], 'drawing_line'] });
          const snapLayer = new atlas.layer.BubbleLayer(source, undefined, { radius: 10, color: 'transparent', strokeColor: '#ec4899', strokeWidth: 4, filter: ['==', ['get', 'type'], 'snap_point'] });

          mapInstance.layers.add([polyLayer, lineLayer, drawLineLayer, drawPointLayer, snapLayer]);
          setMap(mapInstance);
          setLoading(false);

          mapInstance.events.add('click', (e) => {
             if (isDrawingRef.current && e.position) handleDrawingClick(e.position, source);
             else if (stepRef.current === 'labeling' && e.shapes && e.shapes.length > 0) {
                 const shape = e.shapes[0] as atlas.Shape;
                 if (shape.getProperties().isEdge) handleEdgeClick(shape.getProperties().id, shape);
             }
          });
          
          mapInstance.events.add('mousemove', (e) => {
             if (isDrawingRef.current && e.position) handleMouseMove(e.position, source);
          });
      });
    };
    initMap();
    return () => { if (map) map.dispose(); };
  }, [initialLat, initialLng]);

  const loadCredits = async () => { /* Credit logic */ };

  const handleMouseMove = (position: atlas.data.Position, source: atlas.source.DataSource) => {
      const cursor = { lng: position[0], lat: position[1] };
      let closest: Point | null = null;
      let minDist = 0.000005; // Tight snap (approx 0.5m)

      facetsRef.current.forEach(f => f.points.forEach(p => {
          const d = Math.sqrt(Math.pow(p.lat-cursor.lat,2) + Math.pow(p.lng-cursor.lng,2));
          if(d < minDist) { minDist = d; closest = p; }
      }));
      if (currentPointsRef.current.length > 2) {
          const s = currentPointsRef.current[0];
          const d = Math.sqrt(Math.pow(s.lat-cursor.lat,2) + Math.pow(s.lng-cursor.lng,2));
          if(d < minDist) { minDist = d; closest = s; }
      }

      setSnapPoint(closest);
      const shapes = source.getShapes();
      const snapShape = shapes.find(s => s.getProperties().type === 'snap_point');
      if (closest) {
          if (!snapShape) source.add(new atlas.data.Feature(new atlas.data.Point([closest.lng, closest.lat]), { type: 'snap_point' }));
          else (snapShape as atlas.Shape).setCoordinates([closest.lng, closest.lat]);
      } else {
          if (snapShape) source.remove(snapShape);
      }
  };

  const handleDrawingClick = (position: atlas.data.Position, source: atlas.source.DataSource) => {
    const pt = snapPoint || { lng: position[0], lat: position[1] };
    const points = currentPointsRef.current;

    // Check for closing loop
    if (points.length >= 3) {
        const first = points[0];
        // Check exact match (snap) OR close distance
        if ((snapPoint && Math.abs(first.lat - snapPoint.lat) < 0.00000001) || 
            (Math.abs(first.lat - pt.lat) < 0.000005 && Math.abs(first.lng - pt.lng) < 0.000005)) { 
            triggerPitchPrompt(); 
            return; 
        }
    }

    const newPoints = [...points, pt];
    setCurrentPoints(newPoints);
    source.add(new atlas.data.Feature(new atlas.data.Point([pt.lng, pt.lat]), { type: 'drawing_point' }));
    if (points.length > 0) {
        const prev = points[points.length-1];
        source.add(new atlas.data.Feature(new atlas.data.LineString([[prev.lng, prev.lat], [pt.lng, pt.lat]]), { color: '#3b82f6', type: 'drawing_line' }));
    }
  };
  
  const handleManualComplete = () => {
      if(currentPoints.length >= 3) triggerPitchPrompt();
  };

  const handleUndo = () => {
      if(!datasource) return;
      if (isDrawing && currentPoints.length > 0) {
          const newPts = currentPoints.slice(0, -1);
          setCurrentPoints(newPts);
          const shapes = datasource.getShapes();
          datasource.remove(shapes.filter(s => s.getProperties().type?.startsWith('drawing')));
          newPts.forEach((p, i) => {
              datasource.add(new atlas.data.Feature(new atlas.data.Point([p.lng, p.lat]), { type: 'drawing_point' }));
              if (i > 0) {
                  const prev = newPts[i-1];
                  datasource.add(new atlas.data.Feature(new atlas.data.LineString([[prev.lng, prev.lat], [p.lng, p.lat]]), { color: '#3b82f6', type: 'drawing_line' }));
              }
          });
      } else if (!isDrawing && facets.length > 0) {
          const last = facets[facets.length-1];
          const shapes = datasource.getShapes();
          datasource.remove(shapes.filter(s => s.getProperties().id === last.id || s.getProperties().facetId === last.id));
          setFacets(prev => prev.slice(0,-1));
          setEdges(prev => prev.filter(e => e.facetId !== last.id));
      }
  };

  const triggerPitchPrompt = () => { 
      setPendingFacetPoints([...currentPointsRef.current]); // Copy points!
      setShowPitchModal(true); 
  };

  const finalizeFacet = (pitch: number) => {
      try {
          if (!pendingFacetPoints || !datasource) return;
          const points = pendingFacetPoints;
          const facetId = `facet-${Date.now()}`;
          
          const flatArea = atlas.math.getArea(new atlas.data.Polygon([points.map(p=>[p.lng, p.lat])]), 'meters') * 10.7639;
          const mult = Math.sqrt(1 + Math.pow(pitch/12, 2));
          const area = Math.round(flatArea * mult);

          const newFacet: RoofFacet = { id: facetId, name: `Facet ${facets.length+1}`, points, areaSqFt: area, pitch };
          setFacets(prev => [...prev, newFacet]);
          
          const pos = points.map(p => [p.lng, p.lat]); pos.push(pos[0]);
          datasource.add(new atlas.data.Feature(new atlas.data.Polygon([pos]), { id: facetId, isFacet: true }));
          createEdges(newFacet, datasource);
          
          // Cleanup
          const shapes = datasource.getShapes();
          datasource.remove(shapes.filter(s => s.getProperties().type?.startsWith('drawing')));
          
      } catch (err) {
          console.error("Azure Finalize Error", err);
      } finally {
          setCurrentPoints([]); 
          setIsDrawing(false); 
          setPendingFacetPoints(null); 
          setShowPitchModal(false); // Fix for stuck modal
      }
  };

  const createEdges = (facet: RoofFacet, source: atlas.source.DataSource) => {
      const newEdges: RoofEdgeLine[] = [];
      for(let i=0; i<facet.points.length; i++) {
          const p1 = facet.points[i]; const p2 = facet.points[(i+1)%facet.points.length];
          const len = calculateDistance(p1, p2);
          const eid = `edge-${Date.now()}-${i}`;
          const shape = new atlas.data.Shape(new atlas.data.LineString([[p1.lng, p1.lat], [p2.lng, p2.lat]]));
          shape.addProperty('id', eid); shape.addProperty('facetId', facet.id); shape.addProperty('isEdge', true); shape.addProperty('color', EDGE_TYPE_CONFIGS['Eave'].strokeColor);
          source.add(shape);
          newEdges.push({ id: eid, facetId: facet.id, points: [p1, p2], edgeType: 'Eave', lengthFt: len });
      }
      setEdges(prev => [...prev, ...newEdges]);
  };

  const handleEdgeClick = (eid: string, shape: atlas.Shape) => {
      if (stepRef.current !== 'labeling') return;
      shape.addProperty('color', EDGE_TYPE_CONFIGS[selectedEdgeType].strokeColor);
      setEdges(prev => prev.map(e => e.id === eid ? { ...e, edgeType: selectedEdgeType } : e));
  };
  
  const calculateDistance = (p1: Point, p2: Point) => {
       const R = 6371e3; const φ1 = p1.lat * Math.PI/180; const φ2 = p2.lat * Math.PI/180;
       const Δφ = (p2.lat-p1.lat) * Math.PI/180; const Δλ = (p2.lng-p1.lng) * Math.PI/180;
       const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
       return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 3.28084; 
  };
  
  const handleSave = async () => { /* Save logic */ 
     setSaving(true);
     try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) throw new Error('Auth');
        const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
        const totalArea = facets.reduce((sum, f) => sum + f.areaSqFt, 0);
        const edgeTotals: any = { Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0 };
        edges.forEach(e => edgeTotals[e.edgeType] += e.lengthFt);
        const { data, error } = await supabase.from('roof_measurements').insert({
            company_id: userData?.company_id, address, total_area_sqft: totalArea, 
            ridge_length: edgeTotals.Ridge, hip_length: edgeTotals.Hip, valley_length: edgeTotals.Valley, rake_length: edgeTotals.Rake, eave_length: edgeTotals.Eave,
            segments: facets.map(f => ({ name: f.name, area_sqft: f.areaSqFt, pitch: f.pitch, geometry: f.points })), lead_id: leadId || null, status: 'Completed', measurement_type: 'Manual (Azure)'
        }).select().single();
        if (error) throw error;
        await supabase.rpc('decrement_measurement_credits', { p_company_id: userData?.company_id });
        onSave(data);
     } catch(e) { console.error(e); alert('Save failed'); } finally { setSaving(false); }
  };
  
  const getEdgeCounts = () => {
    const counts: Record<EdgeType, number> = { Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0 };
    edges.forEach(edge => counts[edge.edgeType]++);
    return counts;
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
                        <div className="flex items-center text-xs text-pink-400 mr-2"><Magnet size={14} className="mr-1"/> Snapping Active</div>
                        {!isDrawing ? ( <button onClick={() => setIsDrawing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex gap-2"><Grid3x3 size={18} /> Draw Facet</button> ) : ( 
                             <div className="flex gap-2">
                                {/* MANUAL CLOSE BUTTON */}
                                {currentPoints.length >= 3 && (
                                    <button onClick={handleManualComplete} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 animate-pulse">
                                        <CheckCircle2 size={18} /> Finish Shape
                                    </button>
                                )}
                                <button onClick={() => setIsDrawing(false)} className="px-4 py-2 bg-orange-600 text-white rounded-lg">Cancel</button>
                             </div>
                        )}
                        <button onClick={handleUndo} className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"><Undo2 size={18} /></button>
                        <button onClick={() => { if(facets.length>0) setStep('labeling'); }} disabled={facets.length===0} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">Next: Label</button>
                    </>
                )}
                {step === 'labeling' && (
                    <>
                         <p className="text-sm text-blue-200 mr-4">Click lines to color-code.</p>
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
                 {/* Sidebar Content (Same as Google) */}
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
                                <div key={f.id} className="flex justify-between text-sm bg-slate-700 p-2 rounded">
                                    <span>{f.name} ({f.pitch}/12)</span>
                                    <span>{f.areaSqFt.toLocaleString()} sq ft</span>
                                </div>
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
         {loading && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>}
      </div>
      
      {showPitchModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000]">
              <div className="bg-white rounded-xl p-6 w-96 max-w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Set Roof Pitch</h3>
                  <p className="text-slate-600 mb-4 text-sm">Slope of this section?</p>
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

export default AzureRoofrMeasurement;