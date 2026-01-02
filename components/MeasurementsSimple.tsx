import React, { useState, useEffect } from 'react';
import { Ruler, Plus, Search, CreditCard, Eye, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MeasurementTool from './MeasurementTool';
import CreditPurchaseModal from './CreditPurchaseModal';

interface Measurement {
  id: string;
  address: string;
  total_area: number;
  created_at: string;
  segments: any[];
}

const MeasurementsSimple: React.FC = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showNewMeasurement, setShowNewMeasurement] = useState(false);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [credits, setCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeasurements();
    loadCredits();
  }, []);

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

  const filteredMeasurements = measurements.filter(m =>
    m.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showNewMeasurement) {
    return (
      <MeasurementTool
        address={address}
        onSave={handleSaveMeasurement}
        onCancel={() => {
          setShowNewMeasurement(false);
          setAddress('');
        }}
      />
    );
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
            Enter a property address to begin measuring. Each measurement uses 1 credit.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter property address (e.g., 123 Main St, Dallas, TX)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStartMeasurement()}
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleStartMeasurement}
              disabled={!address.trim() || credits < 1}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={20} />
              Start Measurement
            </button>
          </div>
          {credits < 1 && (
            <p className="text-orange-600 text-sm mt-2 font-medium">
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
