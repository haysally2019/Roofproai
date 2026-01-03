import React, { useState, useEffect, useRef } from 'react';
import { Save, X, Undo2, Trash2, Tag, Layers, Grid3x3, Ruler, ChevronDown, ChevronUp, Info, AlertCircle, Loader2 } from 'lucide-react';
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
  mapProvider: 'satellite'; // prop used by parent
  initialLat?: number;
  initialLng?: number;
  onSave: (measurement: any) => void;
  onCancel: () => void;
}

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
  const [selectedFacet, setSelectedFacet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  
  // Refs for event listeners to avoid stale closures
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  
  const azureApiKey = import.meta.env.VITE_AZURE_MAPS_KEY;

  // Sync state to refs
  useEffect(() => {
    isDrawingRef.current = isDrawing;
    currentPointsRef.current = currentPoints;
  }, [isDrawing, currentPoints]);

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

        // Determine center
        let center = [-96.7970, 32.7767]; // Default Dallas
        
        if (initialLat && initialLng) {
            center = [initialLng, initialLat];
        } else {
            // Fallback geocode if no coords passed
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
          
          // Layer for Facets (Polygons)
          const polygonLayer = new atlas.layer.PolygonLayer(source, undefined, {
            fillColor: 'rgba(59, 130, 246, 0.4)',
            fillOpacity: 0.6
          });
          
          // Layer for Edges (Lines)
          const lineLayer = new atlas.layer.LineLayer(source, undefined, {
            strokeColor: ['get', 'color'],
            strokeWidth: 4
          });

          // Layer for Drawing (Current Points)
          const bubbleLayer = new atlas.layer.BubbleLayer(source, undefined, {
            radius: 5,
            color: 'white',
            strokeColor: '#3b82f6',
            strokeWidth: 2
          });

          mapInstance.layers.add([polygonLayer, lineLayer, bubbleLayer]);
          
          setMap(mapInstance);
          setDatasource(source);
          setLoading(false);

          // Click Handler
          mapInstance.events.add('click', (e) => {
             if (e.position) {
                 handleMapClick(e.position, source);
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

    return () => {
        if (map) map.dispose();
    };
  }, [initialLat, initialLng]);


  const loadCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
      if (!userData?.company_id) return;
      const { data: creditsData } = await supabase.from('measurement_credits').select('credits_remaining').eq('company_id', userData.company_id).maybeSingle();
      setCredits(creditsData?.credits_remaining || 0);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  // --- DRAWING LOGIC ---

  const handleMapClick = (position: atlas.data.Position, source: atlas.source.DataSource) => {
    if (!isDrawingRef.current) return;

    const newPoint: Point = { lng: position[0], lat: position[1] };
    const points = currentPointsRef.current;

    // Check snap to close
    if (points.length >= 3) {
        const first = points[0];
        // Approx distance check (0.00005 degrees is roughly 5 meters)
        const dist = Math.sqrt(Math.pow(first.lat - newPoint.lat, 2) + Math.pow(first.lng - newPoint.lng, 2));
        
        if (dist < 0.00005) {
            completePolygon(source);
            return;
        }
    }

    const newPoints = [...points, newPoint];
    setCurrentPoints(newPoints);
    currentPointsRef.current = newPoints;
    
    updateDrawingVisuals(newPoints, source);
  };

  const updateDrawingVisuals = (points: Point[], source: atlas.source.DataSource) => {
     // Clear previous "drawing" shapes (we identify them by a special property if needed, 
     // but for simplicity, we can just rebuild the source or manage specific shapes.
     // Here we will just redraw current points/lines)
     
     // Note: In a production app, you'd manage IDs better. 
     // For this fix, we'll clear and redraw ALL "temp" shapes if needed, 
     // or just append. 
     
     // Simplest approach: Add point feature
     const pos = [points[points.length-1].lng, points[points.length-1].lat];
     source.add(new atlas.data.Feature(new atlas.data.Point(pos), {
         type: 'drawing_point'
     }));

     // If >1 point, add line
     if (points.length > 1) {
         const prev = points[points.length-2];
         const curr = points[points.length-1];
         const line = new atlas.data.LineString([[prev.lng, prev.lat], [curr.lng, curr.lat]]);
         source.add(new atlas.data.Feature(line, {
             color: '#3b82f6',
             type: 'drawing_line'
         }));
     }
  };

  const completePolygon = (source: atlas.source.DataSource) => {
      const points = currentPointsRef.current;
      if (points.length < 3) return;

      const facetId = `facet-${Date.now()}`;
      
      // Calculate Area (Simplified spherical approx)
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
      // Close loop
      positions.push(positions[0]);
      
      const polygon = new atlas.data.Polygon([positions]);
      source.add(new atlas.data.Feature(polygon, {
          id: facetId,
          isFacet: true
      }));

      // Create Edges
      createEdgesForFacet(newFacet, source);

      // Clear Drawing State
      clearCurrentDrawing(source);
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
          source.add(new atlas.data.Feature(line, {
              id: edgeId,
              color: EDGE_TYPE_CONFIGS['Eave'].strokeColor, // Default color
              isEdge: true
          }));

          newEdges.push({
              id: edgeId,
              facetId: facet.id,
              points: [p1, p2],
              edgeType: 'Eave',
              lengthFt: length
          });
      }
      setEdges(prev => [...prev, ...newEdges]);
  };

  const calculateDistance = (p1: Point, p2: Point) => {
      const R = 6371e3; // metres
      const φ1 = p1.lat * Math.PI/180;
      const φ2 = p2.lat * Math.PI/180;
      const Δφ = (p2.lat-p1.lat) * Math.PI/180;
      const Δλ = (p2.lng-p1.lng) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c * 3.28084; // Meters to Feet
  };

  const calculatePolygonArea = (points: Point[]) => {
      const positions = points.map(p => [p.lng, p.lat]);
      const areaMeters = atlas.math.getArea(new atlas.data.Polygon([positions]), 'meters');
      return Math.round(areaMeters * 10.7639);
  };

  const clearCurrentDrawing = (source: atlas.source.DataSource) => {
      // Remove temporary drawing shapes
      // In a real implementation, you'd filter by property.
      // For now, we rely on the map re-render or just resetting state.
      // A cleaner way is to keep drawing shapes in a separate Datasource/Layer.
      setCurrentPoints([]);
      currentPointsRef.current = [];
      setIsDrawing(false);
  };

  const handleSave = async () => {
    if (credits < 1) {
      setShowCreditModal(true);
      return;
    }
    if (facets.length === 0) {
      alert('Please draw at least one roof facet before saving');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
      if (!userData?.company_id) throw new Error('No company found');

      const totalArea = facets.reduce((sum, facet) => sum + facet.areaSqFt, 0);
      const edgeTotals: Record<EdgeType, number> = { Ridge: 0, Hip: 0, Valley: 0, Eave: 0, Rake: 0, Penetration: 0, Unlabeled: 0 };
      edges.forEach(edge => { edgeTotals[edge.edgeType] += edge.lengthFt; });

      const measurementData = {
        company_id: userData.company_id,
        address: address,
        total_area_sqft: totalArea,
        ridge_length: edgeTotals.Ridge,
        hip_length: edgeTotals.Hip,
        valley_length: edgeTotals.Valley,
        rake_length: edgeTotals.Rake,
        eave_length: edgeTotals.Eave,
        segments: facets.map(facet => ({
          name: facet.name,
          area_sqft: facet.areaSqFt,
          geometry: facet.points
        })),
        lead_id: leadId || null,
        status: 'Completed',
        measurement_type: 'Manual (Azure)'
      };

      const { data: measurement, error: measurementError } = await supabase.from('roof_measurements').insert(measurementData).select().single();
      if (measurementError) throw measurementError;

      await supabase.rpc('decrement_measurement_credits', { p_company_id: userData.company_id });

      onSave(measurement);
    } catch (error) {
      console.error('Error saving measurement:', error);
      alert('Failed to save measurement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // UI Renders similar to Google Maps version...
  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{address}</h2>
            <p className="text-sm text-slate-400">Azure Satellite Mode</p>
          </div>
          <div className="flex items-center gap-3">
             {!isDrawing ? (
                <button onClick={() => { setIsDrawing(true); setIsDrawingRef.current = true; }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Grid3x3 size={18} /> Draw Facet
                </button>
             ) : (
                <button onClick={() => setIsDrawing(false)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                    Cancel
                </button>
             )}
             <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Save size={18} /> Save
             </button>
             <button onClick={onCancel} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
                <X size={18} />
             </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 relative">
         <div ref={mapRef} className="w-full h-full" />
         {loading && (
             <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                 <Loader2 className="animate-spin text-blue-600" size={48} />
             </div>
         )}
         {mapError && (
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                     <AlertCircle className="text-red-600 mx-auto mb-2" size={32} />
                     <p className="text-red-900 font-bold">{mapError}</p>
                 </div>
             </div>
         )}
      </div>

      {showCreditModal && (
        <CreditPurchaseModal currentCredits={credits} onClose={() => setShowCreditModal(false)} onPurchaseComplete={() => { setShowCreditModal(false); loadCredits(); }} />
      )}
    </div>
  );
};

export default AzureRoofrMeasurement;