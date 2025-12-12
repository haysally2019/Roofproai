import React, { useState, useRef } from 'react';
import { UploadCloud, AlertTriangle, CheckCircle, Camera } from 'lucide-react';
import { analyzeRoofImage } from '../services/geminiService';

const DamageAnalyzer: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Strip prefix for API
        const base64Data = base64String.split(',')[1];
        setImage(base64String);
        runAnalysis(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async (base64Data: string) => {
    setIsAnalyzing(true);
    setAnalysis("");
    try {
      const result = await analyzeRoofImage(base64Data);
      setAnalysis(result);
    } catch (error) {
      setAnalysis("Error analyzing image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="bg-indigo-900 rounded-xl p-8 text-white flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-3xl font-bold mb-2">AI Damage Detection</h2>
          <p className="text-indigo-200">Upload drone shots or photos. Gemini will identify damage and suggest repairs.</p>
        </div>
        <Camera size={48} className="text-indigo-400 opacity-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer transition-colors ${
            image ? 'border-indigo-300 bg-slate-50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />
          
          {image ? (
            <img src={image} alt="Uploaded Roof" className="max-h-full max-w-full object-contain rounded shadow-sm" />
          ) : (
            <>
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <UploadCloud size={32} />
              </div>
              <p className="text-lg font-medium text-slate-700">Click to upload roof photo</p>
              <p className="text-sm text-slate-400 mt-2">Supports JPG, PNG (Max 5MB)</p>
            </>
          )}
        </div>

        {/* Results Area */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Analysis Report
          </h3>
          
          <div className="flex-1 bg-slate-50 rounded-lg p-4 overflow-y-auto text-sm leading-relaxed text-slate-700 border border-slate-100">
            {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p>Gemini Vision is analyzing patterns...</p>
              </div>
            ) : analysis ? (
              <div className="whitespace-pre-wrap">{analysis}</div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                Upload an image to see AI insights.
              </div>
            )}
          </div>
          
          {analysis && (
            <div className="mt-4 flex gap-3">
               <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium text-sm transition-colors">
                 Create Estimate from Report
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DamageAnalyzer;