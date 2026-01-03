import React, { useState, useEffect, useRef } from 'react';
import { Save, X, Undo2, Trash2, Tag, Layers, Grid3x3, Ruler, ChevronDown, ChevronUp, Info, AlertCircle, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import * as atlas from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.min.css';
import { supabase } from '../lib/supabase';
import { EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import CreditPurchaseModal from './CreditPurchaseModal';
import EdgeTypesGuide from './EdgeTypesGuide';

interface Point {
  lat: number;
  lng: number;
}

interface RoofFacet {
  id: string;
  name: string;
  points: Point[];
  areaSqFt: number;
}

interface RoofEdgeLine {
  id: string;
  facetId: string;
  points: [Point, Point];
  edgeType: EdgeType;
  lengthFt: number;
}

interface AzureRoofrMeasurementProps {
  address: string;
  leadId?: string;
  mapProvider?: 'satellite';
  initialLat?: number;
  initialLng?: number;
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

// Workflow Steps for the "Prompt" System
type WorkflowStep = 'drawing' | 'labeling' | 'review';

const AzureRoofrMeasurement: React.FC<AzureRoofrMeasurementProps> = ({
  address,
  leadId,
  initialLat,
  initialLng,
  onSave,
  onCancel
}) => {
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [datasource, setDatasource] = useState<atlas.source.DataSource | null>(null);
  const [facets, setFacets] = useState<RoofFacet[]>([]);
  const [edges, setEdges] = useState<RoofEdgeLine[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType>('Eave');
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WorkflowStep>('drawing');

  const mapRef = useRef<HTMLDivElement>(null);
  
  // Refs for stale closures
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const stepRef = useRef<WorkflowStep>('drawing');
  const selectedEdgeTypeRef = useRef<EdgeType>('Eave');
  const edgesRef = useRef<RoofEdgeLine[]>([]);

  const azureApiKey = import.meta.env.VITE_AZURE_MAPS_KEY;

  useEffect(() => {
    isDrawingRef.current = isDrawing;
    currentPointsRef.current = currentPoints;
    stepRef.current = step;
    selectedEdgeTypeRef.current = selectedEdgeType;
    edgesRef.current = edges;
  }, [isDrawing, currentPoints, step, selectedEdgeType, edges]);

  useEffect(() => {
    loadCredits();
    
    if (!azureApiKey) {
      setMapError("Azure Maps API Key is missing");
      setLoading(false);
      return;
    }

    const initMap = async () => {
      try {
        if (!mapRef.current) return;

        let center = [-96.7970, 32.7767]; 
        
        if (initialLat && initialLng) {
            center = [initialLng, initialLat];
        } else {
            const response = await fetch(
                `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureApiKey}&query=${encodeURIComponent(address)}`
            );
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                center = [data.results[0].position.lon, data.results[0].position.lat];
            }
        }

        const mapInstance = new atlas.Map(mapRef.current, {
          center: center,
          zoom: 20,
          view: 'Auto',
          style: 'satellite_road_labels',
          authOptions: {
            authType: atlas.AuthenticationType.subscriptionKey,
            subscriptionKey: azureApiKey
          }
        });

        mapInstance.events.add('ready', () => {
          const source = new atlas.source.DataSource();
          mapInstance.sources.add(source);
          
          // Layers
          const polygonLayer = new atlas.layer.PolygonLayer(source, undefined, {
            fillColor: 'rgba(59, 130, 246, 0.4)',
            fillOpacity: 0.5
          });
          
          const lineLayer = new atlas.layer.LineLayer(source, undefined, {
            strokeColor: ['get', 'color'],
            strokeWidth: 5
          });

          // Drawing Temp Layer
          const bubbleLayer = new atlas.layer.BubbleLayer(source, undefined, {
            radius: 5,
            color: 'white',
            strokeColor: '#3b82f6',
            strokeWidth: 2,
            filter: ['==', ['get', 'type'], 'drawing_point']
          });

          mapInstance.layers.add([polygonLayer, lineLayer, bubbleLayer]);
          setMap(mapInstance);
          setDatasource(source);
          setLoading(false);

          // Click Handler
          mapInstance.events.add('click', (e) => {
             // Handle Drawing
             if (isDrawingRef.current && e.position) {
                 handleDrawingClick(e.position, source);
             } 
             // Handle Edge Clicking (Labeling)
             else if (stepRef.current === 'labeling' && e.shapes && e.shapes.length > 0) {
                 const shape = e.shapes[0] as atlas.Shape;
                 const props = shape.getProperties();
                 if (props.isEdge && props.id) {
                     handleEdgeClick(props.id, shape);
                 }
             }
          });
        });
      } catch (err) {
        console.error("Azure Map Init Error:", err);
        setMapError("Failed to initialize Azure Maps");
        setLoading(false);
      }
    };

    initMap();

    return () => { if (map) map.dispose(); };
  }, [initialLat, initialLng]);

  const loadCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
      if (!userData?.company_id) return;
      const { data: creditsData } = await supabase.from('measurement_credits').select('credits_remaining').eq('company_id', userData.company_id).maybeSingle();
      setCredits(creditsData?.credits_remaining || 0);
    } catch (error) { console.error('Error loading credits:', error); }
  };

  // --- LOGIC: DRAWING ---
  const handleDrawingClick = (position: atlas.data.Position, source: atlas.source.DataSource) => {
    const newPoint: Point = { lng: position[0], lat: position[1] };
    const points = currentPointsRef.current;

    // Check snap to close
    if (points.length >= 3) {
        const first = points[0];
        const dist = Math.sqrt(Math.pow(first.lat - newPoint.lat, 2) + Math.pow(first.lng - newPoint.lng, 2));
        if (dist < 0.00005) { // ~5 meters
            completePolygon(source);
            return;
        }
    }

    const newPoints = [...points, newPoint];
    setCurrentPoints(newPoints);
    
    // Visuals
    const pos = [newPoint.lng, newPoint.lat];
    source.add(new atlas.data.Feature(new atlas.data.Point(pos), { type: 'drawing_point' }));
    
    if (points.length > 0) {
        const prev = points[points.length-1];
        const line = new atlas.data.LineString([[prev.lng, prev.lat], [newPoint.lng, newPoint.lat]]);
        source.add(new atlas.data.Feature(line, { color: '#3b82f6', type: 'drawing_line' }));
    }
  };

  const completePolygon = (source: atlas.source.DataSource) => {
      const points = currentPointsRef.current;
      if (points.length < 3) return;

      const facetId = `facet-${Date.now()}`;
      const area = calculatePolygonArea(points);
      
      const newFacet: RoofFacet = {
          id: facetId,
          name: `Facet ${facets.length + 1}`,
          points: points,
          areaSqFt: area
      };

      setFacets(prev => [...prev, newFacet]);

      // Draw Polygon
      const positions = points.map(p => [p.lng, p.lat]);
      positions.push(positions[0]); // Close loop
      
      const polygon = new atlas.data.Polygon([positions]);
      source.add(new atlas.data.Feature(polygon, { id: facetId, isFacet: true }));

      // AUTO-GENERATE EDGES (Exactly like Google)
      createEdgesForFacet(newFacet, source);

      // Reset
      setCurrentPoints([]);
      setIsDrawing(false);
      
      // Clear temp drawing shapes
      // In Azure maps, we remove shapes by ID or filter. simpler here to reload source or track IDs.
      // For this snippet, we assume we leave them or implement a clear function.
      const shapes = source.getShapes();
      const tempShapes = shapes.filter(s => s.getProperties().type?.startsWith('drawing'));
      source.remove(tempShapes);
  };

  const createEdgesForFacet = (facet: RoofFacet, source: atlas.source.DataSource) => {
      const newEdges: RoofEdgeLine[] = [];
      
      for(let i=0; i<facet.points.length; i++) {
          const p1 = facet.points[i];
          const p2 = facet.points[(i+1) % facet.points.length];
          
          const length = calculateDistance(p1, p2);
          const edgeId = `edge-${Date.now()}-${i}`;
          
          // Draw Line
          const line = new atlas.data.LineString([[p1.lng, p1.lat], [p2.lng, p2.lat]]);
          const shape = new atlas.data.Shape(new atlas.data.LineString([[p1.lng, p1.lat], [p2.lng, p2.lat]]));
          
          shape.addProperty('id', edgeId);
          shape.addProperty('isEdge', true);
          shape.addProperty('color', EDGE_TYPE_CONFIGS['Eave'].strokeColor);
          
          source.add(shape);

          newEdges.push({
              id: edgeId,
              facetId: facet.id,
              points: [p1, p2],
              edgeType: 'Eave', // Default
              lengthFt: length
          });
      }
      setEdges(prev => [...prev, ...newEdges]);
  };

  // --- LOGIC: LABELING ---
  const handleEdgeClick = (edgeId: string, shape: atlas.Shape) => {
      if (stepRef.current !== 'labeling') return;
      
      const type = selectedEdgeTypeRef.current;
      const config = EDGE_TYPE_CONFIGS[type];

      // Update Visuals
      shape.addProperty('color', config.strokeColor);

      // Update State
      setEdges(prev => prev.map(e => {
          if (e.id === edgeId) {
              return { ...e, edgeType: type };
          }
          return e;
      }));
  };

  const calculateDistance = (p1: Point, p2: Point) => {
      const R = 6371e3; 
      const φ1 = p1.lat * Math.PI/180;
      const φ2 = p2.lat * Math.PI/180;
      const Δφ = (p2.lat-p1.lat) * Math.PI/180;
      const Δλ = (p2.lng-p1.lng) * Math.PI/180;
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c * 3.28084; 
  };

  const calculatePolygonArea = (points: Point[]) => {
      const positions = points.map(p => [p.lng, p.lat]);
      const areaMeters = atlas.math.getArea(new atlas.data.Polygon([positions]), 'meters');
      return Math.round(areaMeters * 10.7639);
  };

  const handleSave = async () => {
    if (credits < 1) { setShowCreditModal(true); return; }
    if (facets.length === 0) { alert('Draw a roof first'); return; }
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
      
      const totalArea = facets.reduce((sum, facet) => sum + facet.areaSqFt, 0);
      const edgeTotals: Record<EdgeType, number> = { Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0 };
      edges.forEach(edge => { edgeTotals[edge.edgeType] += edge.lengthFt; });

      const measurementData = {
        company_id: userData?.company_id,
        address: address,
        total_area_sqft: totalArea,
        ridge_length: edgeTotals.Ridge,
        hip_length: edgeTotals.Hip,
        valley_length: edgeTotals.Valley,
        rake_length: edgeTotals.Rake,
        eave_length: edgeTotals.Eave,
        segments: facets.map(facet => ({ name: facet.name, area_sqft: facet.areaSqFt, geometry: facet.points })),
        lead_id: leadId || null,
        status: 'Completed',
        measurement_type: 'Manual (Azure)'
      };

      const { data: measurement, error } = await supabase.from('roof_measurements').insert(measurementData).select().single();
      if (error) throw error;
      await supabase.rpc('decrement_measurement_credits', { p_company_id: userData?.company_id });
      onSave(measurement);
    } catch (error) {
      console.error(error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getEdgeCounts = () => {
    const counts: Record<EdgeType, number> = { Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0 };
    edges.forEach(edge => counts[edge.edgeType]++);
    return counts;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* --- HEADER WITH PROMPT SYSTEM --- */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
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
                        <p className="text-sm text-blue-200 mr-4">Click map points to outline roof sections.</p>
                        {!isDrawing ? (
                            <button onClick={() => setIsDrawing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Grid3x3 size={18} /> Draw Facet</button>
                        ) : (
                            <button onClick={() => setIsDrawing(false)} className="px-4 py-2 bg-orange-600 text-white rounded-lg">Cancel</button>
                        )}
                        <button onClick={() => { if(facets.length > 0) setStep('labeling'); }} disabled={facets.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">Next: Label Edges</button>
                    </>
                )}

                {step === 'labeling' && (
                    <>
                         <p className="text-sm text-blue-200 mr-4">Select a type on left, then click lines on map.</p>
                         <button onClick={() => setStep('drawing')} className="px-3 py-2 bg-slate-700 text-white rounded-lg">Back</button>
                         <button onClick={() => setStep('review')} className="px-4 py-2 bg-green-600 text-white rounded-lg">Next: Review</button>
                    </>
                )}

                {step === 'review' && (
                     <>
                        <button onClick={() => setStep('labeling')} className="px-3 py-2 bg-slate-700 text-white rounded-lg">Back</button>
                        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg animate-pulse">
                            <Save size={18} /> Purchase & Save Report
                        </button>
                     </>
                )}
                
                <button onClick={onCancel} className="p-2 bg-slate-800 text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
         {/* SIDEBAR */}
         {showSidebar && (
            <div className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto flex flex-col">
                 <div className="p-4 flex-1">
                    {step === 'labeling' ? (
                        <div>
                             <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Tag size={18} className="text-blue-400" /> Select Edge Type</h3>
                             <div className="space-y-2">
                                {Object.entries(EDGE_TYPE_CONFIGS).map(([type, config]) => (
                                    <button key={type} onClick={() => setSelectedEdgeType(type as EdgeType)} className={`w-full p-3 rounded-lg border-2 transition-all text-left ${selectedEdgeType === type ? 'border-white bg-slate-700 shadow-lg' : 'border-slate-600 bg-slate-750'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.color }} />
                                        <div className="font-semibold text-white text-sm">{config.label}</div>
                                    </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Layers size={18} className="text-purple-400" /> Facets ({facets.length})</h3>
                            <div className="space-y-2 mb-6">
                                {facets.map(f => (
                                    <div key={f.id} className="p-2 bg-slate-700 rounded border border-slate-600 flex justify-between text-sm text-white">
                                        <span>{f.name}</span>
                                        <span>{f.areaSqFt.toLocaleString()} sq ft</span>
                                    </div>
                                ))}
                            </div>
                            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Ruler size={18} className="text-emerald-400" /> Totals</h3>
                             <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-white border-b border-slate-600 pb-2"><span>Total Area:</span><span className="font-bold">{facets.reduce((s,f)=>s+f.areaSqFt,0).toLocaleString()} sq ft</span></div>
                                {Object.entries(getEdgeCounts()).map(([type, count]) => {
                                    if(count === 0) return null;
                                    const len = edges.filter(e => e.edgeType === type).reduce((sum,e) => sum + e.lengthFt, 0);
                                    return <div key={type} className="flex justify-between text-slate-300"><span>{type}:</span><span>{Math.round(len)} ft</span></div>
                                })}
                             </div>
                        </div>
                    )}
                 </div>
            </div>
         )}
         
         <div className="flex-1 relative">
             <div ref={mapRef} className="w-full h-full" />
             {loading && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>}
         </div>
      </div>
      
      {showCreditModal && <CreditPurchaseModal currentCredits={credits} onClose={()=>setShowCreditModal(false)} onPurchaseComplete={()=>{setShowCreditModal(false); loadCredits();}} />}
    </div>
  );
};

export default AzureRoofrMeasurement;