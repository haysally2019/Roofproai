import React, { useState, useRef, useEffect } from 'react';
import { FileText, AlertTriangle, CheckCircle, Sparkles, Upload, X, Mail } from 'lucide-react';
import { analyzeScopeOfLoss, analyzeScopeFromImage } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

const SupplementDetector: React.FC = () => {
  const [scopeText, setScopeText] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }, []);

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
      setIsAnalyzing(true);
      setAnalysis('Processing PDF...');
      try {
        console.log('Starting PDF processing...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);

        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        });

        console.log('Loading PDF document...');
        const pdf = await loadingTask.promise;
        console.log('PDF loaded successfully, pages:', pdf.numPages);

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          console.log(`Processing page ${i}/${pdf.numPages}...`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .filter((item: any) => item.str)
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
        }

        console.log('Text extraction complete. Length:', fullText.length);

        if (fullText.trim()) {
          setScopeText(fullText.trim());
          setAnalysis('');
        } else {
          setAnalysis('No text found in PDF. The PDF might be scanned or image-based. Try uploading as an image instead.');
          setUploadedFile(null);
        }
        setIsAnalyzing(false);
      } catch (error: any) {
        console.error('Error parsing PDF:', error);
        console.error('Error details:', {
          message: error?.message,
          name: error?.name,
          stack: error?.stack
        });
        const errorMessage = error?.message || 'Unknown error';
        setAnalysis(`Error reading PDF: ${errorMessage}. Try uploading the file as an image or text file instead.`);
        setUploadedFile(null);
        setIsAnalyzing(false);
      }
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

  const generateEmailToAdjuster = () => {
    const subject = 'Supplement Request - Additional Items for Review';

    const body = `Dear Adjuster,

I hope this message finds you well. I am writing to request a supplement for the following items that were identified as missing from the original scope of loss:

${analysis}

Each of these items is necessary to complete the restoration work properly and in accordance with:
- Industry best practices and manufacturer specifications
- Local and national building codes
- Insurance policy coverage provisions

I have included detailed justification for each supplement item above. Please review these findings at your earliest convenience so we can move forward with the claim resolution.

I am available to discuss these items further or schedule a time to walk through them in person if needed. Please let me know if you require any additional documentation or clarification.

Thank you for your attention to this matter.

Best regards,
[Your Name]
[Your Company Name]
[Your Phone Number]
[Your Email]`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
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
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 text-white flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-3xl font-bold mb-2">AI Supplement Detector</h2>
          <p className="text-indigo-100">Paste an insurance scope. AI will identify missing line items like O&P, code upgrades, and more.</p>
        </div>
        <div className="p-3 rounded-xl bg-white bg-opacity-10">
          <AlertTriangle size={32} className="text-indigo-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" />
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
                className="text-xs px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors font-medium flex items-center gap-1"
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
            <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                <span className="text-sm text-slate-700 font-medium">{uploadedFile.name}</span>
              </div>
              <button
                onClick={clearFile}
                className="text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <textarea
            value={scopeText}
            onChange={(e) => setScopeText(e.target.value)}
            placeholder="Paste insurance scope text here, or upload a file above...&#10;&#10;Example:&#10;1. Remove shingles - 25 SQ @ $45/SQ&#10;2. Install new shingles - 25 SQ @ $85/SQ&#10;3. Replace decking - 8 sheets @ $45/sheet&#10;..."
            className="flex-1 w-full p-4 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50 resize-none focus:ring-2 focus:ring-indigo-500 outline-none min-h-0"
            disabled={isAnalyzing}
          />

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || !scopeText.trim()}
            className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col shadow-sm overflow-hidden">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-indigo-600" />
            Analysis Results
          </h3>

          <div className="flex-1 bg-slate-50 rounded-lg p-4 overflow-y-auto text-sm leading-relaxed text-slate-700 border border-slate-100 min-h-0">
            {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p>Analyzing scope for missing supplements...</p>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap break-words">{analysis}</div>
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
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={generateEmailToAdjuster}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Email to Adjuster
              </button>
              <div className="flex gap-2">
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
            </div>
          )}
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-sm">
        <h4 className="text-sm font-bold text-indigo-900 mb-3">Common Supplements to Look For:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-indigo-700">
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-indigo-600" />
            Overhead & Profit
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-indigo-600" />
            Code Upgrades
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-indigo-600" />
            Ventilation Improvements
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-indigo-600" />
            Drip Edge Installation
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-indigo-600" />
            Pipe Collars/Flashings
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-indigo-600" />
            Valley Metal
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-indigo-600" />
            Waste Factor
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-indigo-600" />
            Steep Pitch Charges
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplementDetector;
