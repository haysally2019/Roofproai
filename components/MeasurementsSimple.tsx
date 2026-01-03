import React, { useState, useEffect, useRef } from 'react';
import { Ruler, Plus, Search, CreditCard, Eye, Trash2, Download, MapIcon, Satellite, Globe, Box, CheckCircle, XCircle, Loader2, Sparkles, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MeasurementTool from './MeasurementTool';
import RoofMeasurementWorkflow from './RoofMeasurementWorkflow';
import CreditPurchaseModal from './CreditPurchaseModal';
import { checkSolarAvailability } from '../lib/googleSolarApi';
import { generateMeasurementReportPDF } from '../lib/pdfGenerator';

interface Measurement {
  id: string;
  address: string;
  total_area: number;
  created_at: string;
  segments: any[];
  has_3d_model?: boolean;
  measurement_type?: string;
  lead_id?: string;
}

interface AddressSuggestion {
  address: string;
  position: {
    lat: number;
    lon: number;
  };
}

interface Lead {
  id: string;
  name: string;
  address: string;
  status: string;
}

const MeasurementsSimple: React.FC = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showNewMeasurement, setShowNewMeasurement] = useState(false);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedMapProvider, setSelectedMapProvider] = useState<'google' | 'azure_satellite' | 'azure_labels'>('google');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [has3DAvailable, setHas3DAvailable] = useState<boolean | null>(null);
  const [checking3D, setChecking3D] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const azureApiKey = import.meta.env.VITE_AZURE_MAPS_KEY;

  useEffect(() => {
    loadMeasurements();
    loadCredits();
    loadLeads();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (address.length >= 3) {
      const timer = setTimeout(() => {
        searchAddress(address);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  }, [address]);

  const loadMeasurements = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data, error } = await supabase
        .from('roof_measurements')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data: creditsData } = await supabase
        .from('measurement_credits')
        .select('credits_remaining')
        .eq('company_id', userData.company_id)
        .maybeSingle();

      setCredits(creditsData?.credits_remaining || 0);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data, error } = await supabase
        .from('leads')
        .select('id, name, address, status')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const searchAddress = async (query: string) => {
    if (!azureApiKey || query.length < 3) return;

    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureApiKey}&query=${encodeURIComponent(query)}&limit=5&countrySet=US`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const suggestions = data.results.map((result: any) => ({
          address: result.address.freeformAddress,
          position: {
            lat: result.position.lat,
            lon: result.position.lon
          }
        }));
        setAddressSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSuggestions([]);
    } finally {
      setIsGeocoding(false);
    }
  };

  const selectAddress = async (suggestion: AddressSuggestion) => {
    setAddress(suggestion.address);
    setSelectedCoordinates(suggestion.position);
    setShowSuggestions(false);
    await check3DAvailability(suggestion.position.lat, suggestion.position.lon);
  };

  const handleLeadSelection = async (leadId: string) => {
    setSelectedLead(leadId);
    if (leadId === '') {
      setAddress('');
      setSelectedCoordinates(null);
      setHas3DAvailable(null);
      return;
    }

    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setAddress(lead.address);
      const coords = await geocodeAddressToCoords(lead.address);
      if (coords) {
        setSelectedCoordinates(coords);
        await check3DAvailability(coords.lat, coords.lon);
      }
    }
  };

  const geocodeAddressToCoords = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    if (!azureApiKey) return null;
    try {
      const response = await fetch(
        `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureApiKey}&query=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].position.lat,
          lon: data.results[0].position.lon
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const check3DAvailability = async (lat: number, lon: number) => {
    setChecking3D(true);
    setHas3DAvailable(null);
    try {
      const result = await checkSolarAvailability(lat, lon);
      setHas3DAvailable(result.available && result.hasHighQuality === true);
    } catch (error) {
      console.error('3D check error:', error);
      setHas3DAvailable(false);
    } finally {
      setChecking3D(false);
    }
  };

  const handleStartMeasurement = () => {
    if (!address.trim()) {
      alert('Please enter an address');
      return;
    }
    setShowNewMeasurement(true);
  };

  const handleSaveMeasurement = async (measurement: any) => {
    await loadMeasurements();
    await loadCredits();
    setShowNewMeasurement(false);
    setAddress('');
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this measurement?')) return;

    try {
      const { error } = await supabase
        .from('roof_measurements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadMeasurements();
    } catch (error) {
      console.error('Error deleting measurement:', error);
      alert('Failed to delete measurement');
    }
  };

  const handleDownloadReport = (measurement: Measurement) => {
    try {
      generateMeasurementReportPDF({
        address: measurement.address,
        total_area: measurement.total_area,
        segments: measurement.segments || [],
        measurement_date: measurement.created_at,
        has_3d_model: measurement.has_3d_model,
        measurement_type: measurement.measurement_type
      });
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate measurement report');
    }
  };

  const filteredMeasurements = measurements.filter(m =>
    m.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showNewMeasurement) {
    if (selectedMapProvider === 'google') {
      return (
        <RoofMeasurementWorkflow
          address={address}
          leadId={selectedLead || undefined}
          onSave={handleSaveMeasurement}
          onCancel={() => {
            setShowNewMeasurement(false);
            setAddress('');
            setSelectedLead('');
            setHas3DAvailable(null);
          }}
        />
      );
    } else {
      return (
        <MeasurementTool
          address={address}
          leadId={selectedLead || undefined}
          mapProvider={selectedMapProvider === 'azure_satellite' ? 'satellite' : 'satellite_road_labels'}
          onSave={handleSaveMeasurement}
          onCancel={() => {
            setShowNewMeasurement(false);
            setAddress('');
            setSelectedLead('');
            setHas3DAvailable(null);
          }}
        />
      );
    }
  }

  return (
    <>
      <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Ruler className="text-blue-600" />
              Roof Measurements
            </h1>
            <p className="text-slate-500 mt-1">DIY satellite measurements with high-resolution imagery</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border-2 border-slate-200 px-5 py-3 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <CreditCard size={20} className="text-blue-600" />
                <div>
                  <div className="text-sm text-slate-500">Credits Available</div>
                  <div className="text-2xl font-bold text-slate-900">{credits}</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCreditModal(true)}
              className="px-5 py-3 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-semibold shadow-sm"
            >
              Buy Credits
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-slate-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-3 text-lg">Start New Measurement</h3>
          <p className="text-slate-600 mb-4 text-sm">
            Select a lead or enter an address directly. Manual measurements use 1 credit, 3D models use 2 credits.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Lead (Optional)
              </label>
              <select
                value={selectedLead}
                onChange={(e) => handleLeadSelection(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">No Lead - Enter Address Directly</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} - {lead.address} ({lead.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 relative">
              <div className="flex-1 relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Property Address
                </label>
                <input
                  ref={addressInputRef}
                  type="text"
                  placeholder="Enter property address (e.g., 123 Main St, Dallas, TX)"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setSelectedLead('');
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleStartMeasurement()}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={selectedLead !== ''}
                />
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto"
                  >
                    {addressSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => selectAddress(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <p className="font-medium text-slate-900">{suggestion.address}</p>
                      </button>
                    ))}
                  </div>
                )}
                {isGeocoding && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>

            {checking3D && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Loader2 className="animate-spin text-blue-600" size={20} />
                <span className="text-sm font-medium text-blue-700">Checking for 3D model availability...</span>
              </div>
            )}

            {has3DAvailable === true && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-lg">
                <Sparkles className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="text-emerald-600" size={18} />
                    <h4 className="font-bold text-emerald-900">3D Model Available - Recommended!</h4>
                  </div>
                  <p className="text-sm text-emerald-700">
                    High-quality 3D roof model detected from Google Solar API. Automated measurements will be more accurate. Uses 2 credits.
                  </p>
                </div>
              </div>
            )}

            {has3DAvailable === false && selectedCoordinates && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <XCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700">
                    No 3D model available for this location. Manual measurement will be used (1 credit).
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Map Provider
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMapProvider('google')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMapProvider === 'google'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Globe size={24} className={selectedMapProvider === 'google' ? 'text-blue-600' : 'text-slate-600'} />
                    <div className="text-center">
                      <p className={`font-semibold text-sm ${selectedMapProvider === 'google' ? 'text-blue-900' : 'text-slate-900'}`}>
                        Google Maps
                      </p>
                      <p className="text-xs text-slate-500">Recommended</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMapProvider('azure_satellite')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMapProvider === 'azure_satellite'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Satellite size={24} className={selectedMapProvider === 'azure_satellite' ? 'text-blue-600' : 'text-slate-600'} />
                    <div className="text-center">
                      <p className={`font-semibold text-sm ${selectedMapProvider === 'azure_satellite' ? 'text-blue-900' : 'text-slate-900'}`}>
                        Azure Satellite
                      </p>
                      <p className="text-xs text-slate-500">Clean view</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMapProvider('azure_labels')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMapProvider === 'azure_labels'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <MapIcon size={24} className={selectedMapProvider === 'azure_labels' ? 'text-blue-600' : 'text-slate-600'} />
                    <div className="text-center">
                      <p className={`font-semibold text-sm ${selectedMapProvider === 'azure_labels' ? 'text-blue-900' : 'text-slate-900'}`}>
                        Azure + Labels
                      </p>
                      <p className="text-xs text-slate-500">With streets</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={handleStartMeasurement}
              disabled={!address.trim() || credits < 1}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Start Measurement
            </button>
          </div>

          {credits < 1 && (
            <p className="text-orange-600 text-sm mt-3 font-medium">
              You need to purchase credits to create measurements
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">Total Measurements</p>
            <p className="text-2xl font-bold text-slate-900">{measurements.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">Total Area Measured</p>
            <p className="text-2xl font-bold text-blue-600">
              {measurements.reduce((sum, m) => sum + (m.total_area || 0), 0).toLocaleString()} sq ft
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">This Month</p>
            <p className="text-2xl font-bold text-emerald-600">
              {measurements.filter(m => {
                const date = new Date(m.created_at);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">Credits Used</p>
            <p className="text-2xl font-bold text-slate-900">{measurements.length}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search measurements by address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <p className="text-slate-600">Loading measurements...</p>
            </div>
          ) : filteredMeasurements.length === 0 ? (
            <div className="text-center py-16">
              <Ruler size={64} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Measurements Yet</h3>
              <p className="text-slate-600 mb-6">Start measuring roofs using satellite imagery</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Address</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Total Area</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Sections</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeasurements.map((measurement) => (
                    <tr key={measurement.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">{measurement.address}</p>
                        {measurement.lead_id && (
                          <p className="text-xs text-blue-600 mt-1">Linked to Lead</p>
                        )}
                      </td>
                      <td className="p-4">
                        {measurement.has_3d_model ? (
                          <div className="flex items-center gap-1.5">
                            <Box className="text-emerald-600" size={16} />
                            <span className="text-xs font-semibold text-emerald-700">3D Model</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">{measurement.measurement_type || 'Manual'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-blue-600">{(measurement.total_area || 0).toLocaleString()} sq ft</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-700">{measurement.segments?.length || 0} sections</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-600 text-sm">
                          {new Date(measurement.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadReport(measurement)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download Report"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteMeasurement(measurement.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onPurchaseComplete={loadCredits}
        currentCredits={credits}
      />
    </>
  );
};

export default MeasurementsSimple;
