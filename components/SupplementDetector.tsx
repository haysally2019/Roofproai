import React, { useState, useRef } from 'react';
import { FileText, AlertTriangle, CheckCircle, Sparkles, Upload, X } from 'lucide-react';
import { analyzeScopeOfLoss, analyzeScopeFromImage } from '../services/geminiService';

const SupplementDetector: React.FC = () => {
  const [scopeText, setScopeText] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    const fileType = file.type;

    if (fileType.startsWith('text/') || file.name.endsWith('.txt')) {
      const text = await file.text();
      setScopeText(text);
    } else if (fileType.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];

        setIsAnalyzing(true);
        setAnalysis('');
        try {
          const result = await analyzeScopeFromImage(base64Data, fileType);
          setAnalysis(result);
        } catch (error) {
          setAnalysis('Error analyzing image. Please try again.');
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } else if (fileType === 'application/pdf') {
      setAnalysis('PDF support coming soon. Please extract text and paste it, or upload as an image screenshot.');
      setUploadedFile(null);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setScopeText('');
    setAnalysis('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const runAnalysis = async () => {
    if (!scopeText.trim()) return;

    setIsAnalyzing(true);
    setAnalysis('');
    try {
      const result = await analyzeScopeOfLoss(scopeText);
      setAnalysis(result);
    } catch (error) {
      setAnalysis('Error analyzing scope. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(analysis);
      alert('Analysis copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateSupplementLetter = () => {
    const letter = `Dear Insurance Adjuster,

I am writing to request a supplement for the following items that were not included in the original scope of loss:

${analysis}

Please review these items and adjust the claim accordingly. All recommendations are based on industry standards, building codes, and proper roofing practices.

Thank you for your attention to this matter.

Best regards,
[Your Name]
[Company Name]`;

    const blob = new Blob([letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplement-request.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pasteExample = () => {
    const exampleScope = `ROOFING ESTIMATE - CLAIM #ABC123

Line Items:
1. Remove existing shingles - 25 SQ @ $45/SQ = $1,125
2. Install new shingles (Owens Corning Duration) - 25 SQ @ $85/SQ = $2,125
3. Install underlayment - 25 SQ @ $25/SQ = $625
4. Replace damaged decking - 8 sheets @ $45/sheet = $360
5. Ridge vent installation - 40 LF @ $12/LF = $480

Total: $4,715`;
    setScopeText(exampleScope);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-8 text-white flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-3xl font-bold mb-2">AI Supplement Detector</h2>
          <p className="text-amber-100">Paste an insurance scope. AI will identify missing line items like O&P, code upgrades, and more.</p>
        </div>
        <AlertTriangle size={48} className="text-amber-200 opacity-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-amber-600" />
              Insurance Scope
            </h3>
            <div className="flex gap-2">
              <button
                onClick={pasteExample}
                className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors font-medium"
              >
                Load Example
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors font-medium flex items-center gap-1"
              >
                <Upload size={14} />
                Upload File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.jpg,.jpeg,.png,.gif,.webp,.pdf,text/*,image/*"
                className="hidden"
              />
            </div>
          </div>

          {uploadedFile && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-amber-600" />
                <span className="text-sm text-slate-700 font-medium">{uploadedFile.name}</span>
              </div>
              <button
                onClick={clearFile}
                className="text-amber-600 hover:text-amber-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <textarea
            value={scopeText}
            onChange={(e) => setScopeText(e.target.value)}
            placeholder="Paste insurance scope text here, or upload a file above...&#10;&#10;Example:&#10;1. Remove shingles - 25 SQ @ $45/SQ&#10;2. Install new shingles - 25 SQ @ $85/SQ&#10;3. Replace decking - 8 sheets @ $45/sheet&#10;..."
            className="flex-1 w-full p-4 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50 resize-none focus:ring-2 focus:ring-amber-500 outline-none"
            disabled={isAnalyzing}
          />

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || !scopeText.trim()}
            className="mt-4 w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing Scope...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Detect Missing Supplements
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            Analysis Results
          </h3>

          <div className="flex-1 bg-slate-50 rounded-lg p-4 overflow-y-auto text-sm leading-relaxed text-slate-700 border border-slate-100">
            {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <p>Analyzing scope for missing supplements...</p>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap">{analysis}</div>
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p>Review these findings with your adjuster and reference relevant policy language or building codes when requesting supplements.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                Paste a scope and click analyze to see potential supplements.
              </div>
            )}
          </div>

          {analysis && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={generateSupplementLetter}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Download Letter
              </button>
              <button
                onClick={copyToClipboard}
                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h4 className="text-sm font-bold text-blue-900 mb-2">Common Supplements to Look For:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-blue-600" />
            Overhead & Profit
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-blue-600" />
            Code Upgrades
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-blue-600" />
            Ventilation Improvements
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-blue-600" />
            Drip Edge Installation
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-blue-600" />
            Pipe Collars/Flashings
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-blue-600" />
            Valley Metal
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-blue-600" />
            Waste Factor
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-blue-600" />
            Steep Pitch Charges
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplementDetector;
