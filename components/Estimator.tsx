import React, { useState, useEffect, useRef } from 'react';
import { EstimateItem, Lead, Estimate, EstimateTier } from '../types';
import {
  Sparkles, Save, Calculator, RotateCcw,
  PenTool, Satellite, FileText, Truck, AlertTriangle, Scan, Crosshair,
  Eye, EyeOff, Search, Download, Maximize2, Minimize2, Ruler, Undo, Trash2, Layers
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
  const fullscreenMapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fullscreenSearchRef = useRef<HTMLInputElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [drawingManager, setDrawingManager] = useState<any>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [highContrast, setHighContrast] = useState(false);
  const [staticImageUrl, setStaticImageUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [measurementMode, setMeasurementMode] = useState<'polygon' | 'ruler' | 'ridge' | 'hip' | 'valley' | 'eave' | 'rake' | 'penetration' | null>(null);
  const [rulerLine, setRulerLine] = useState<any>(null);
  const [measurements, setMeasurements] = useState<Array<{type: string, value: number, label: string}>>([]);
  const [roofFeatures, setRoofFeatures] = useState<Array<{
    type: 'ridge' | 'hip' | 'valley' | 'eave' | 'rake' | 'penetration',
    length: number,
    line: any,
    marker: any,
    label: string
  }>>([]);
  const [tempMeasurementStart, setTempMeasurementStart] = useState<any>(null);

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
    const targetRef = isFullscreen ? fullscreenMapRef.current : mapRef.current;
    if (!targetRef || !window.google?.maps) return;

    try {
        const map = new window.google.maps.Map(targetRef, {
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

        const activeSearchInput = isFullscreen ? fullscreenSearchRef.current : searchInputRef.current;
        if (activeSearchInput) {
            const autocomplete = new window.google.maps.places.Autocomplete(activeSearchInput, { types: ['address'] });
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

  useEffect(() => {
    if (isFullscreen && window.google?.maps && fullscreenMapRef.current) {
      if (mapInstance) {
        const currentCenter = mapInstance.getCenter();
        const currentZoom = mapInstance.getZoom();

        setTimeout(() => {
          const newMap = new window.google.maps.Map(fullscreenMapRef.current!, {
            center: currentCenter || { lat: 39.8283, lng: -98.5795 },
            zoom: currentZoom || 4,
            mapTypeId: mapInstance.getMapTypeId() || 'satellite',
            tilt: 0,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            rotateControl: false,
            zoomControl: true,
          });

          polygons.forEach(poly => {
            poly.setMap(newMap);
          });

          if (drawingManager) {
            drawingManager.setMap(newMap);
          }

          setMapInstance(newMap);

          newMap.addListener('idle', () => {
            const center = newMap.getCenter();
            if(center) setMapCenter({ lat: center.lat(), lng: center.lng() });
          });

          if (fullscreenSearchRef.current) {
            const autocomplete = new window.google.maps.places.Autocomplete(fullscreenSearchRef.current, { types: ['address'] });
            autocomplete.bindTo('bounds', newMap);
            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (!place.geometry?.location) return;

              if (place.geometry.viewport) newMap.fitBounds(place.geometry.viewport);
              else { newMap.setCenter(place.geometry.location); newMap.setZoom(20); }

              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              fetchRoofData(lat, lng);
              setStaticImageUrl(`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=400x400&maptype=satellite&key=${apiKey}`);
            });
          }
        }, 100);
      }
    } else if (!isFullscreen && mapRef.current && mapInstance && window.google?.maps) {
      const currentCenter = mapInstance.getCenter();
      const currentZoom = mapInstance.getZoom();

      setTimeout(() => {
        const newMap = new window.google.maps.Map(mapRef.current!, {
          center: currentCenter || { lat: 39.8283, lng: -98.5795 },
          zoom: currentZoom || 4,
          mapTypeId: mapInstance.getMapTypeId() || 'satellite',
          tilt: 0,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          rotateControl: false,
          zoomControl: true,
        });

        polygons.forEach(poly => {
          poly.setMap(newMap);
        });

        if (drawingManager) {
          drawingManager.setMap(newMap);
        }

        setMapInstance(newMap);

        newMap.addListener('idle', () => {
          const center = newMap.getCenter();
          if(center) setMapCenter({ lat: center.lat(), lng: center.lng() });
        });

        if (searchInputRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, { types: ['address'] });
          autocomplete.bindTo('bounds', newMap);
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry?.location) return;

            if (place.geometry.viewport) newMap.fitBounds(place.geometry.viewport);
            else { newMap.setCenter(place.geometry.location); newMap.setZoom(20); }

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            fetchRoofData(lat, lng);
            setStaticImageUrl(`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=400x400&maptype=satellite&key=${apiKey}`);
          });
        }
      }, 100);
    }
  }, [isFullscreen]);

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

  const startRulerMode = () => {
    if (!mapInstance) return;

    setMeasurementMode('ruler');
    if (drawingManager) drawingManager.setDrawingMode(null);

    let startPoint: any = null;
    let tempLine: any = null;

    const clickListener = window.google.maps.event.addListener(mapInstance, 'click', (e: any) => {
      if (!startPoint) {
        startPoint = e.latLng;
      } else {
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(startPoint, e.latLng);
        const distanceFeet = Math.round(distance * 3.28084);

        const line = new window.google.maps.Polyline({
          path: [startPoint, e.latLng],
          strokeColor: '#ef4444',
          strokeWeight: 3,
          map: mapInstance,
        });

        const midPoint = window.google.maps.geometry.spherical.interpolate(startPoint, e.latLng, 0.5);
        const marker = new window.google.maps.Marker({
          position: midPoint,
          map: mapInstance,
          label: {
            text: `${distanceFeet}'`,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold'
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 0,
          }
        });

        setMeasurements(prev => [...prev, { type: 'distance', value: distanceFeet, label: `${distanceFeet} ft` }]);

        startPoint = null;
        window.google.maps.event.removeListener(clickListener);
        setMeasurementMode(null);
      }
    });
  };

  const startRoofFeatureMeasurement = (featureType: 'ridge' | 'hip' | 'valley' | 'eave' | 'rake' | 'penetration') => {
    if (!mapInstance) return;

    setMeasurementMode(featureType);
    if (drawingManager) drawingManager.setDrawingMode(null);

    const featureColors: Record<string, string> = {
      ridge: '#ef4444',
      hip: '#f59e0b',
      valley: '#3b82f6',
      eave: '#10b981',
      rake: '#8b5cf6',
      penetration: '#ec4899'
    };

    const featureLabels: Record<string, string> = {
      ridge: 'Ridge',
      hip: 'Hip',
      valley: 'Valley',
      eave: 'Eave',
      rake: 'Rake',
      penetration: 'Penetration'
    };

    const clickListener = window.google.maps.event.addListener(mapInstance, 'click', (e: any) => {
      if (!tempMeasurementStart) {
        setTempMeasurementStart(e.latLng);

        const startMarker = new window.google.maps.Marker({
          position: e.latLng,
          map: mapInstance,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: featureColors[featureType],
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 6,
          }
        });
      } else {
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(tempMeasurementStart, e.latLng);
        const distanceFeet = Math.round(distance * 3.28084);

        const line = new window.google.maps.Polyline({
          path: [tempMeasurementStart, e.latLng],
          strokeColor: featureColors[featureType],
          strokeWeight: 4,
          map: mapInstance,
        });

        const midPoint = window.google.maps.geometry.spherical.interpolate(tempMeasurementStart, e.latLng, 0.5);
        const marker = new window.google.maps.Marker({
          position: midPoint,
          map: mapInstance,
          label: {
            text: `${featureLabels[featureType]}: ${distanceFeet}'`,
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold'
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: featureColors[featureType],
            fillOpacity: 0.9,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 8,
          }
        });

        const endMarker = new window.google.maps.Marker({
          position: e.latLng,
          map: mapInstance,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: featureColors[featureType],
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 6,
          }
        });

        setRoofFeatures(prev => [...prev, {
          type: featureType,
          length: distanceFeet,
          line: line,
          marker: marker,
          label: `${featureLabels[featureType]}: ${distanceFeet} ft`
        }]);

        addToast(`${featureLabels[featureType]} measured: ${distanceFeet} ft`, "success");

        setTempMeasurementStart(null);
        window.google.maps.event.removeListener(clickListener);
        setMeasurementMode(null);
      }
    });
  };

  const undoLastPolygon = () => {
    if (polygons.length > 0) {
      const lastPoly = polygons[polygons.length - 1];
      const areaMeters = window.google.maps.geometry.spherical.computeArea(lastPoly.getPath());
      const areaSqFt = Math.round(areaMeters * 10.7639);

      lastPoly.setMap(null);
      setPolygons(prev => prev.slice(0, -1));
      setTotalSurfaceArea(prev => Math.max(0, prev - areaSqFt));
      addToast("Polygon removed", "info");
    }
  };

  const clearAllPolygons = () => {
    polygons.forEach(p => p.setMap(null));
    setPolygons([]);
    setTotalSurfaceArea(0);
    setMeasurements([]);
    roofFeatures.forEach(f => {
      if (f.line) f.line.setMap(null);
      if (f.marker) f.marker.setMap(null);
    });
    setRoofFeatures([]);
    addToast("All measurements cleared", "info");
  };

  const undoLastFeature = () => {
    if (roofFeatures.length > 0) {
      const lastFeature = roofFeatures[roofFeatures.length - 1];
      if (lastFeature.line) lastFeature.line.setMap(null);
      if (lastFeature.marker) lastFeature.marker.setMap(null);
      setRoofFeatures(prev => prev.slice(0, -1));
      addToast("Feature removed", "info");
    }
  };

  const getTotalFeatureLength = (type: string) => {
    return roofFeatures
      .filter(f => f.type === type)
      .reduce((sum, f) => sum + f.length, 0);
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

      const baseItems = [
          { description: "Mobilization & Safety", quantity: 1, unit: 'LS', unitPrice: mobPrice, total: mobPrice },
          { description: "Tear-off & Disposal", quantity: squares, unit: 'SQ', unitPrice: tearOffPrice, total: squares * tearOffPrice },
          { description: `Install ${selectedTier} System`, quantity: squares, unit: 'SQ', unitPrice: (pricePerSq - tearOffPrice), total: squares * (pricePerSq - tearOffPrice) },
          { description: "Ice & Water Shield Upgrade", quantity: Math.ceil(sqFt * 0.15), unit: 'SF', unitPrice: iceWaterPrice, total: Math.ceil(sqFt * 0.15) * iceWaterPrice },
          { description: "Flashings & Ventilation", quantity: 1, unit: 'LS', unitPrice: flashPrice, total: flashPrice },
      ];

      // Add roof feature line items
      const featureItems: EstimateItem[] = [];

      const ridgeLength = getTotalFeatureLength('ridge');
      if (ridgeLength > 0) {
          const ridgePrice = findPrice('Ridge Cap', 8.50);
          featureItems.push({
              description: "Ridge Cap Installation",
              quantity: ridgeLength,
              unit: 'LF',
              unitPrice: ridgePrice,
              total: ridgeLength * ridgePrice
          });
      }

      const hipLength = getTotalFeatureLength('hip');
      if (hipLength > 0) {
          const hipPrice = findPrice('Hip Cap', 8.50);
          featureItems.push({
              description: "Hip Cap Installation",
              quantity: hipLength,
              unit: 'LF',
              unitPrice: hipPrice,
              total: hipLength * hipPrice
          });
      }

      const valleyLength = getTotalFeatureLength('valley');
      if (valleyLength > 0) {
          const valleyPrice = findPrice('Valley Metal', 12.00);
          featureItems.push({
              description: "Valley Metal Installation",
              quantity: valleyLength,
              unit: 'LF',
              unitPrice: valleyPrice,
              total: valleyLength * valleyPrice
          });
      }

      const eaveLength = getTotalFeatureLength('eave');
      if (eaveLength > 0) {
          const eavePrice = findPrice('Drip Edge', 4.50);
          featureItems.push({
              description: "Drip Edge Installation",
              quantity: eaveLength,
              unit: 'LF',
              unitPrice: eavePrice,
              total: eaveLength * eavePrice
          });
      }

      const rakeLength = getTotalFeatureLength('rake');
      if (rakeLength > 0) {
          const rakePrice = findPrice('Rake Metal', 4.50);
          featureItems.push({
              description: "Rake Edge Installation",
              quantity: rakeLength,
              unit: 'LF',
              unitPrice: rakePrice,
              total: rakeLength * rakePrice
          });
      }

      const penetrationCount = roofFeatures.filter(f => f.type === 'penetration').length;
      if (penetrationCount > 0) {
          const penPrice = findPrice('Pipe Boot', 35.00);
          featureItems.push({
              description: "Pipe Boot Installation",
              quantity: penetrationCount,
              unit: 'EA',
              unitPrice: penPrice,
              total: penetrationCount * penPrice
          });
      }

      setItems([...baseItems, ...featureItems]);

      const baseMaterials = [
          { description: `${selectedTier} Shingles`, quantity: squares * 3, unit: 'BDL', unitPrice: 38.00, total: squares * 3 * 38.00 },
      ];

      const materialFeatures: EstimateItem[] = [];
      if (ridgeLength > 0) {
          materialFeatures.push({
              description: "Ridge Cap Shingles",
              quantity: Math.ceil(ridgeLength / 30),
              unit: 'BDL',
              unitPrice: 45.00,
              total: Math.ceil(ridgeLength / 30) * 45.00
          });
      }
      if (valleyLength > 0) {
          materialFeatures.push({
              description: "Valley Metal",
              quantity: Math.ceil(valleyLength / 10),
              unit: 'PC',
              unitPrice: 28.00,
              total: Math.ceil(valleyLength / 10) * 28.00
          });
      }

      setMaterialList([...baseMaterials, ...materialFeatures]);
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
    <div className={`flex flex-col overflow-hidden relative isolate ${isFullscreen ? 'fixed inset-0 z-[9999] bg-slate-900' : 'h-full'}`}>
      {/* HEADER */}
      {!isFullscreen && (
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
      )}

      {/* FULLSCREEN MAP MODE */}
      {isFullscreen && activeTab === 'map' && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col">
          {/* Fullscreen Header */}
          <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Satellite size={20}/> Roof Measurement
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <input ref={fullscreenSearchRef} placeholder="Search Address..." className="w-96 pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 outline-none focus:border-indigo-500"/>
              </div>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2"
            >
              <Minimize2 size={18}/> Exit Fullscreen
            </button>
          </div>

          <div className="flex-1 flex relative">
            {/* Map Container */}
            <div className="flex-1 relative">
              <div
                ref={fullscreenMapRef}
                className="absolute inset-0 w-full h-full z-0 transition-[filter] duration-300"
                style={{ filter: highContrast ? 'contrast(1.4) brightness(1.1) saturate(0.8)' : 'none' }}
              ></div>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5] opacity-40">
                <Crosshair size={48} className="text-white drop-shadow-lg" strokeWidth={1.5} />
              </div>

              {/* Floating Toolbar */}
              <div className="absolute top-4 left-4 z-[10] flex flex-col gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
                  <p className="text-xs font-bold text-slate-500 uppercase px-2 pt-1">Area Measurement</p>
                  <button
                    onClick={() => fetchRoofData()}
                    disabled={analyzing || !mapCenter}
                    className="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {analyzing ? <span className="animate-spin">...</span> : <Scan size={16}/>} Auto-Measure
                  </button>
                  <button
                    onClick={() => {
                      if(drawingManager) {
                        drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                        setMeasurementMode('polygon');
                      }
                    }}
                    className={`px-4 py-2 ${measurementMode === 'polygon' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'} rounded font-bold text-sm flex items-center gap-2 hover:bg-indigo-50`}
                  >
                    <PenTool size={16}/> Draw Area
                  </button>

                  <div className="border-t border-slate-200 my-1"></div>
                  <p className="text-xs font-bold text-slate-500 uppercase px-2">Roof Features</p>

                  <button
                    onClick={() => startRoofFeatureMeasurement('ridge')}
                    className={`px-4 py-2 ${measurementMode === 'ridge' ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border-2 border-red-500'} rounded font-bold text-xs flex items-center gap-2 hover:bg-red-50`}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500"></div> Ridge
                  </button>
                  <button
                    onClick={() => startRoofFeatureMeasurement('hip')}
                    className={`px-4 py-2 ${measurementMode === 'hip' ? 'bg-amber-600 text-white' : 'bg-white text-slate-700 border-2 border-amber-500'} rounded font-bold text-xs flex items-center gap-2 hover:bg-amber-50`}
                  >
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div> Hip
                  </button>
                  <button
                    onClick={() => startRoofFeatureMeasurement('valley')}
                    className={`px-4 py-2 ${measurementMode === 'valley' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border-2 border-blue-500'} rounded font-bold text-xs flex items-center gap-2 hover:bg-blue-50`}
                  >
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div> Valley
                  </button>
                  <button
                    onClick={() => startRoofFeatureMeasurement('eave')}
                    className={`px-4 py-2 ${measurementMode === 'eave' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border-2 border-emerald-500'} rounded font-bold text-xs flex items-center gap-2 hover:bg-emerald-50`}
                  >
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Eave
                  </button>
                  <button
                    onClick={() => startRoofFeatureMeasurement('rake')}
                    className={`px-4 py-2 ${measurementMode === 'rake' ? 'bg-purple-600 text-white' : 'bg-white text-slate-700 border-2 border-purple-500'} rounded font-bold text-xs flex items-center gap-2 hover:bg-purple-50`}
                  >
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div> Rake
                  </button>
                  <button
                    onClick={() => startRoofFeatureMeasurement('penetration')}
                    className={`px-4 py-2 ${measurementMode === 'penetration' ? 'bg-pink-600 text-white' : 'bg-white text-slate-700 border-2 border-pink-500'} rounded font-bold text-xs flex items-center gap-2 hover:bg-pink-50`}
                  >
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div> Penetration
                  </button>

                  <div className="border-t border-slate-200 my-1"></div>
                  <button
                    onClick={undoLastFeature}
                    disabled={roofFeatures.length === 0}
                    className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded font-bold text-xs flex items-center gap-2 hover:bg-amber-50 disabled:opacity-50"
                  >
                    <Undo size={14}/> Undo Feature
                  </button>
                  <button
                    onClick={undoLastPolygon}
                    disabled={polygons.length === 0}
                    className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded font-bold text-xs flex items-center gap-2 hover:bg-amber-50 disabled:opacity-50"
                  >
                    <Undo size={14}/> Undo Area
                  </button>
                  <button
                    onClick={clearAllPolygons}
                    disabled={polygons.length === 0 && roofFeatures.length === 0}
                    className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded font-bold text-xs flex items-center gap-2 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={14}/> Clear All
                  </button>
                  <button
                    onClick={() => setHighContrast(!highContrast)}
                    className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded font-bold text-xs flex items-center gap-2 hover:bg-slate-50"
                  >
                    {highContrast ? <EyeOff size={14}/> : <Eye size={14}/>} Contrast
                  </button>
                </div>
              </div>

              {/* Measurement Info Panel */}
              <div className="absolute top-4 right-4 z-[10] bg-white rounded-lg shadow-lg p-4 min-w-[320px] max-h-[calc(100vh-8rem)] overflow-y-auto">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Layers size={18}/> Measurements
                </h3>
                <div className="space-y-2">
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Total Area</p>
                    <p className="text-2xl font-extrabold text-indigo-900">{totalSurfaceArea.toLocaleString()} <span className="text-sm font-normal">sqft</span></p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Polygons</p>
                    <p className="text-lg font-bold text-slate-900">{polygons.length}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Mode</p>
                    <p className="text-sm font-bold text-indigo-600">{measurementSource === 'api' ? '3D Auto' : 'Manual Trace'}</p>
                  </div>

                  {roofFeatures.length > 0 && (
                    <>
                      <div className="border-t border-slate-200 my-2"></div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Roof Features</p>

                      {getTotalFeatureLength('ridge') > 0 && (
                        <div className="p-2 bg-red-50 rounded border border-red-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-xs font-bold text-slate-700">Ridge</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{getTotalFeatureLength('ridge')} ft</span>
                        </div>
                      )}

                      {getTotalFeatureLength('hip') > 0 && (
                        <div className="p-2 bg-amber-50 rounded border border-amber-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span className="text-xs font-bold text-slate-700">Hip</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{getTotalFeatureLength('hip')} ft</span>
                        </div>
                      )}

                      {getTotalFeatureLength('valley') > 0 && (
                        <div className="p-2 bg-blue-50 rounded border border-blue-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-bold text-slate-700">Valley</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{getTotalFeatureLength('valley')} ft</span>
                        </div>
                      )}

                      {getTotalFeatureLength('eave') > 0 && (
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-bold text-slate-700">Eave</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{getTotalFeatureLength('eave')} ft</span>
                        </div>
                      )}

                      {getTotalFeatureLength('rake') > 0 && (
                        <div className="p-2 bg-purple-50 rounded border border-purple-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-xs font-bold text-slate-700">Rake</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{getTotalFeatureLength('rake')} ft</span>
                        </div>
                      )}

                      {getTotalFeatureLength('penetration') > 0 && (
                        <div className="p-2 bg-pink-50 rounded border border-pink-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                            <span className="text-xs font-bold text-slate-700">Penetrations</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{roofFeatures.filter(f => f.type === 'penetration').length}</span>
                        </div>
                      )}

                      <div className="text-xs text-slate-500 mt-2 italic">
                        {roofFeatures.length} feature{roofFeatures.length !== 1 ? 's' : ''} marked
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10] bg-white rounded-lg shadow-lg p-4 flex gap-3">
                <button
                  onClick={calculateEstimate}
                  disabled={totalSurfaceArea === 0}
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 shadow-lg flex items-center gap-2"
                >
                  <Calculator size={18}/> Generate Estimate
                </button>
                <button
                  onClick={handleAiEstimate}
                  disabled={totalSurfaceArea === 0 || isAiGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 shadow-lg flex items-center gap-2"
                >
                  {isAiGenerating ? <span className="animate-spin">✨</span> : <Sparkles size={18}/>} AI Smart Scope
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-auto bg-slate-50 p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative z-0 ${isFullscreen ? 'hidden' : ''}`}>

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
                          <div className="absolute top-2 right-2 z-[5] flex gap-2">
                              <button
                                onClick={() => setIsFullscreen(true)}
                                className="p-2 bg-white rounded shadow text-slate-600 hover:text-indigo-600"
                              >
                                <Maximize2 size={16}/>
                              </button>
                              <button onClick={() => setHighContrast(!highContrast)} className="p-2 bg-white rounded shadow text-slate-600 hover:text-indigo-600">
                                  {highContrast ? <EyeOff size={16}/> : <Eye size={16}/>}
                              </button>
                          </div>
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5] opacity-60">
                              <Crosshair size={32} className="text-white drop-shadow-md" strokeWidth={1.5} />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                          <button onClick={() => fetchRoofData()} disabled={analyzing || !mapCenter} className="py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs flex justify-center items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                              {analyzing ? <span className="animate-spin">...</span> : <Scan size={14}/>} Auto-Measure
                          </button>
                          <button onClick={() => { if(drawingManager) { drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON); setMeasurementMode('polygon'); } }} className="py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-bold text-xs flex justify-center items-center gap-2 hover:bg-slate-50">
                              <PenTool size={14}/> Manual Trace
                          </button>
                      </div>

                      <div className="mb-3">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-2 px-1">Roof Features</p>
                          <div className="grid grid-cols-3 gap-1.5">
                              <button onClick={() => startRoofFeatureMeasurement('ridge')} className="py-1.5 bg-white text-slate-700 border-2 border-red-400 rounded text-xs font-bold flex justify-center items-center gap-1 hover:bg-red-50">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div> Ridge
                              </button>
                              <button onClick={() => startRoofFeatureMeasurement('hip')} className="py-1.5 bg-white text-slate-700 border-2 border-amber-400 rounded text-xs font-bold flex justify-center items-center gap-1 hover:bg-amber-50">
                                  <div className="w-2 h-2 rounded-full bg-amber-500"></div> Hip
                              </button>
                              <button onClick={() => startRoofFeatureMeasurement('valley')} className="py-1.5 bg-white text-slate-700 border-2 border-blue-400 rounded text-xs font-bold flex justify-center items-center gap-1 hover:bg-blue-50">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> Valley
                              </button>
                              <button onClick={() => startRoofFeatureMeasurement('eave')} className="py-1.5 bg-white text-slate-700 border-2 border-emerald-400 rounded text-xs font-bold flex justify-center items-center gap-1 hover:bg-emerald-50">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Eave
                              </button>
                              <button onClick={() => startRoofFeatureMeasurement('rake')} className="py-1.5 bg-white text-slate-700 border-2 border-purple-400 rounded text-xs font-bold flex justify-center items-center gap-1 hover:bg-purple-50">
                                  <div className="w-2 h-2 rounded-full bg-purple-500"></div> Rake
                              </button>
                              <button onClick={() => startRoofFeatureMeasurement('penetration')} className="py-1.5 bg-white text-slate-700 border-2 border-pink-400 rounded text-xs font-bold flex justify-center items-center gap-1 hover:bg-pink-50">
                                  <div className="w-2 h-2 rounded-full bg-pink-500"></div> Pen
                              </button>
                          </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                          <button onClick={undoLastFeature} disabled={roofFeatures.length === 0} className="py-2 bg-white text-slate-700 border border-slate-200 rounded font-bold text-xs flex justify-center items-center gap-1 hover:bg-amber-50 disabled:opacity-50">
                              <Undo size={10}/> Feature
                          </button>
                          <button onClick={undoLastPolygon} disabled={polygons.length === 0} className="py-2 bg-white text-slate-700 border border-slate-200 rounded font-bold text-xs flex justify-center items-center gap-1 hover:bg-amber-50 disabled:opacity-50">
                              <Undo size={10}/> Area
                          </button>
                          <button onClick={clearAllPolygons} disabled={polygons.length === 0 && roofFeatures.length === 0} className="py-2 bg-white text-red-600 border border-red-200 rounded font-bold text-xs flex justify-center items-center gap-1 hover:bg-red-50 disabled:opacity-50">
                              <Trash2 size={10}/> Clear
                          </button>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                          <div className="flex justify-between items-center mb-2">
                              <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase">Total Area</p>
                                  <p className="text-xl font-extrabold text-slate-800">{totalSurfaceArea.toLocaleString()} <span className="text-xs font-normal text-slate-500">sqft</span></p>
                              </div>
                              <div className="text-right">
                                  <p className="text-xs font-bold text-slate-400 uppercase">Polygons</p>
                                  <span className="text-sm font-bold text-indigo-600">{polygons.length}</span>
                              </div>
                          </div>

                          {roofFeatures.length > 0 && (
                              <>
                                  <div className="border-t border-slate-200 my-2"></div>
                                  <div className="space-y-1">
                                      {getTotalFeatureLength('ridge') > 0 && (
                                          <div className="flex justify-between text-xs">
                                              <span className="text-slate-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>Ridge</span>
                                              <span className="font-bold text-slate-800">{getTotalFeatureLength('ridge')} ft</span>
                                          </div>
                                      )}
                                      {getTotalFeatureLength('hip') > 0 && (
                                          <div className="flex justify-between text-xs">
                                              <span className="text-slate-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Hip</span>
                                              <span className="font-bold text-slate-800">{getTotalFeatureLength('hip')} ft</span>
                                          </div>
                                      )}
                                      {getTotalFeatureLength('valley') > 0 && (
                                          <div className="flex justify-between text-xs">
                                              <span className="text-slate-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Valley</span>
                                              <span className="font-bold text-slate-800">{getTotalFeatureLength('valley')} ft</span>
                                          </div>
                                      )}
                                      {getTotalFeatureLength('eave') > 0 && (
                                          <div className="flex justify-between text-xs">
                                              <span className="text-slate-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Eave</span>
                                              <span className="font-bold text-slate-800">{getTotalFeatureLength('eave')} ft</span>
                                          </div>
                                      )}
                                      {getTotalFeatureLength('rake') > 0 && (
                                          <div className="flex justify-between text-xs">
                                              <span className="text-slate-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Rake</span>
                                              <span className="font-bold text-slate-800">{getTotalFeatureLength('rake')} ft</span>
                                          </div>
                                      )}
                                      {roofFeatures.filter(f => f.type === 'penetration').length > 0 && (
                                          <div className="flex justify-between text-xs">
                                              <span className="text-slate-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div>Penetrations</span>
                                              <span className="font-bold text-slate-800">{roofFeatures.filter(f => f.type === 'penetration').length}</span>
                                          </div>
                                      )}
                                  </div>
                              </>
                          )}
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