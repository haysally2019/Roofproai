interface SolarApiLocation {
  lat: number;
  lng: number;
}

interface RoofSegmentSummary {
  pitchDegrees: number;
  azimuthDegrees: number;
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  segmentIndex: number;
}

interface SolarPotential {
  maxArrayPanelsCount: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  carbonOffsetFactorKgPerMwh: number;
  roofSegmentStats: RoofSegmentSummary[];
}

interface SolarApiResponse {
  name: string;
  center: SolarApiLocation;
  boundingBox: {
    sw: SolarApiLocation;
    ne: SolarApiLocation;
  };
  imageryDate: {
    year: number;
    month: number;
    day: number;
  };
  imageryProcessedDate: {
    year: number;
    month: number;
    day: number;
  };
  postalCode: string;
  administrativeArea: string;
  statisticalArea: string;
  regionCode: string;
  solarPotential: SolarPotential;
  imageryQuality: string;
}

export interface SolarAvailabilityResult {
  available: boolean;
  data?: SolarApiResponse;
  error?: string;
  hasHighQuality?: boolean;
}

export interface BuildingInsightsResult {
  available: boolean;
  roofSegments?: {
    area: number;
    pitch: number;
    azimuth: number;
    center: { lat: number; lng: number };
  }[];
  totalArea?: number;
  imageryDate?: string;
  imageryQuality?: string;
  solarPanelCapacity?: number;
  error?: string;
}

const SOLAR_API_BASE = 'https://solar.googleapis.com/v1';

export async function checkSolarAvailability(
  lat: number,
  lng: number
): Promise<SolarAvailabilityResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY;

  if (!apiKey) {
    return {
      available: false,
      error: 'Solar API key not configured'
    };
  }

  try {
    const url = `${SOLAR_API_BASE}/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`;

    const response = await fetch(url);

    if (response.status === 404) {
      return {
        available: false,
        error: 'No 3D model available for this location'
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        available: false,
        error: `Solar API error: ${response.status} - ${errorText}`
      };
    }

    const data: SolarApiResponse = await response.json();

    const hasHighQuality = data.imageryQuality === 'HIGH' || data.imageryQuality === 'MEDIUM';

    return {
      available: true,
      data,
      hasHighQuality
    };
  } catch (error) {
    console.error('Solar API check error:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function fetchBuildingInsights(
  lat: number,
  lng: number
): Promise<BuildingInsightsResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY;

  if (!apiKey) {
    return {
      available: false,
      error: 'Solar API key not configured'
    };
  }

  try {
    // FIX APPLIED: Removed "&requiredQuality=HIGH" to allow MEDIUM quality reports
    const url = `${SOLAR_API_BASE}/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      return {
        available: false,
        error: `Unable to fetch 3D building data: ${response.status}`
      };
    }

    const data: SolarApiResponse = await response.json();

    const roofSegments = data.solarPotential.roofSegmentStats.map(segment => ({
      area: 0, // Area is calculated per segment if needed, or derived from total
      pitch: segment.pitchDegrees,
      azimuth: segment.azimuthDegrees,
      center: data.center
    }));

    const totalArea = data.solarPotential.maxArrayAreaMeters2 * 10.7639;

    const imageryDate = `${data.imageryDate.year}-${String(data.imageryDate.month).padStart(2, '0')}-${String(data.imageryDate.day).padStart(2, '0')}`;

    return {
      available: true,
      roofSegments,
      totalArea: Math.round(totalArea),
      imageryDate,
      imageryQuality: data.imageryQuality,
      solarPanelCapacity: data.solarPotential.maxArrayPanelsCount * 400
    };
  } catch (error) {
    console.error('Building insights fetch error:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Failed to fetch building insights'
    };
  }
}

export async function getDataLayerUrl(
  lat: number,
  lng: number,
  layerType: 'dsm' | 'rgb' | 'mask' | 'annualFlux' | 'monthlyFlux'
): Promise<{ url: string | null; error?: string }> {
  const apiKey = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY;

  if (!apiKey) {
    return {
      url: null,
      error: 'Solar API key not configured'
    };
  }

  try {
    const url = `${SOLAR_API_BASE}/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=50&view=FULL_LAYERS&requiredQuality=HIGH&pixelSizeMeters=0.1&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      return {
        url: null,
        error: `Unable to fetch data layer: ${response.status}`
      };
    }

    const data = await response.json();

    const layerMap: { [key: string]: string } = {
      dsm: data.dsmUrl,
      rgb: data.rgbUrl,
      mask: data.maskUrl,
      annualFlux: data.annualFluxUrl,
      monthlyFlux: data.monthlyFluxUrl
    };

    return {
      url: layerMap[layerType] || null
    };
  } catch (error) {
    console.error('Data layer fetch error:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Failed to fetch data layer'
    };
  }
}