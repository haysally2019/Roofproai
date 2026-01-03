import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
}

const MapDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([
    { name: 'Google Maps API Key', status: 'checking', message: 'Checking...' },
    { name: 'Azure Maps API Key', status: 'checking', message: 'Checking...' },
    { name: 'Google Maps Script', status: 'checking', message: 'Checking...' },
    { name: 'Azure Maps Module', status: 'checking', message: 'Checking...' }
  ]);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const updateResult = (index: number, status: DiagnosticResult['status'], message: string) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], status, message };
      return newResults;
    });
  };

  const runDiagnostics = async () => {
    const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const azureApiKey = import.meta.env.VITE_AZURE_MAPS_KEY;

    updateResult(
      0,
      googleApiKey ? 'success' : 'error',
      googleApiKey ? `Found: ${googleApiKey.substring(0, 20)}...` : 'Not configured'
    );

    updateResult(
      1,
      azureApiKey ? 'success' : 'error',
      azureApiKey ? `Found: ${azureApiKey.substring(0, 20)}...` : 'Not configured'
    );

    if (googleApiKey) {
      try {
        const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=${googleApiKey}`;
        const response = await fetch(testUrl);
        const data = await response.json();

        if (data.status === 'OK') {
          updateResult(2, 'success', 'Google Maps API working correctly');
        } else if (data.status === 'REQUEST_DENIED') {
          updateResult(2, 'error', `API Error: ${data.error_message || 'Request denied - check API restrictions'}`);
        } else {
          updateResult(2, 'error', `API Status: ${data.status}`);
        }
      } catch (error) {
        updateResult(2, 'error', `Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    } else {
      updateResult(2, 'error', 'No API key to test');
    }

    if (azureApiKey) {
      try {
        const testUrl = `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${azureApiKey}&query=Dallas,%20TX`;
        const response = await fetch(testUrl);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          updateResult(3, 'success', 'Azure Maps API working correctly');
        } else if (data.error) {
          updateResult(3, 'error', `API Error: ${data.error.message || 'Access denied'}`);
        } else {
          updateResult(3, 'error', 'No results returned');
        }
      } catch (error) {
        updateResult(3, 'error', `Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    } else {
      updateResult(3, 'error', 'No API key to test');
    }
  };

  const getIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="animate-spin text-blue-500" size={20} />;
      case 'success':
        return <CheckCircle className="text-emerald-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
    }
  };

  const allSuccess = results.every(r => r.status === 'success');
  const hasErrors = results.some(r => r.status === 'error');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Map Services Diagnostics</h2>
              <p className="text-sm text-slate-600">Checking map API configurations</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                result.status === 'success'
                  ? 'bg-emerald-50 border-emerald-200'
                  : result.status === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {getIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{result.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{result.message}</p>
                </div>
              </div>
            </div>
          ))}

          {hasErrors && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Troubleshooting Steps:</h4>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>1. Verify API keys are set in .env file</li>
                <li>2. Check if keys have proper restrictions/permissions</li>
                <li>3. Ensure billing is enabled for API services</li>
                <li>4. Verify keys haven't expired</li>
                <li>5. Check API quotas haven't been exceeded</li>
              </ul>
            </div>
          )}

          {allSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <CheckCircle className="text-emerald-500 mx-auto mb-2" size={32} />
              <p className="font-semibold text-emerald-900">All map services are working correctly!</p>
              <p className="text-sm text-emerald-700 mt-1">You can close this diagnostic window.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Reload Page
          </button>
          <button
            onClick={runDiagnostics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Re-run Tests
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapDiagnostics;
