import React from 'react';
import { Download, Send, CheckCircle } from 'lucide-react';
import { Contract } from '../types';

interface ContractDocumentProps {
  contract: Contract;
  onBack: () => void;
}

const ContractDocument: React.FC<ContractDocumentProps> = ({ contract, onBack }) => {
  return (
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-slate-600 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
        >
          ← Back to Contracts
        </button>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 font-semibold shadow-sm hover:shadow">
            <Download size={18} />
            Download PDF
          </button>
          <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg">
            <Send size={18} />
            Send to Client
          </button>
        </div>
      </div>

      <div className="bg-white shadow-2xl border-2 border-slate-200 max-w-5xl mx-auto w-full overflow-hidden">
        <div className="border-b-4 border-blue-600 bg-gradient-to-r from-slate-50 to-slate-100 px-12 py-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-1">Roofing Contract</div>
              <h1 className="text-4xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>Professional Services Agreement</h1>
              <div className="text-lg text-slate-600 font-medium">Contract No. {contract.number}</div>
            </div>
            <div className="text-right">
              <div className="bg-white px-4 py-2 rounded-lg border-2 border-blue-600 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Status</div>
                <div className={`text-lg font-bold ${contract.status === 'Signed' ? 'text-emerald-600' : contract.status === 'Active' ? 'text-blue-600' : 'text-slate-700'}`}>
                  {contract.status}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-12 py-8 max-h-[800px] overflow-y-auto space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-3">Client Information</div>
              <div>
                <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>{contract.leadName}</div>
                <div className="text-slate-600 mt-2 space-y-1 leading-relaxed">
                  <div>{contract.leadAddress}</div>
                  <div className="font-medium">{contract.leadPhone}</div>
                  <div className="text-blue-600">{contract.leadEmail}</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-3">Contract Details</div>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600 font-medium">Type:</span>
                  <span className="font-bold text-slate-900">{contract.type}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600 font-medium">Created:</span>
                  <span className="font-semibold text-slate-900">{new Date(contract.createdDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {contract.startDate && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600 font-medium">Start Date:</span>
                    <span className="font-semibold text-slate-900">{new Date(contract.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                {contract.completionDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Completion:</span>
                    <span className="font-semibold text-slate-900">{new Date(contract.completionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t-2 border-slate-200 pt-6">
            <h2 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-4">Project Description</h2>
            <p className="text-slate-700 leading-relaxed text-base" style={{ textAlign: 'justify' }}>
              {contract.projectDescription || 'This agreement outlines the professional roofing services to be provided by the Contractor to the Client at the address specified above.'}
            </p>
          </div>

          <div className="border-t-2 border-slate-200 pt-6">
            <h2 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-4">Scope of Work</h2>
            <div className="bg-slate-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
              <div className="space-y-3">
                {(contract.scopeOfWork.length > 0 ? contract.scopeOfWork : [
                  'Complete tear-off of existing roofing materials',
                  'Inspection and repair of roof decking as needed',
                  'Installation of ice and water shield in valleys and eaves',
                  'Installation of premium underlayment',
                  'Installation of new architectural shingles',
                  'Installation of ridge vent and proper ventilation',
                  'Cleanup and removal of all debris'
                ]).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-slate-800 leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {contract.materials.length > 0 && (
            <div className="border-t-2 border-slate-200 pt-6">
              <h2 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-4">Materials to be Provided</h2>
              <div className="grid grid-cols-2 gap-3">
                {contract.materials.map((material, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
                    <CheckCircle className="text-emerald-600 shrink-0" size={18} />
                    <span className="text-slate-800 font-medium">{material}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t-2 border-slate-200 pt-6">
            <h2 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-4">Financial Terms</h2>
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 border-2 border-blue-200 rounded-xl p-6 shadow-inner">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b-2 border-blue-200">
                  <span className="text-lg font-bold text-slate-900">Total Contract Value</span>
                  <span className="text-3xl font-bold text-blue-600">${contract.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-slate-700">Deposit Required</span>
                  <span className="text-xl font-bold text-slate-900">${contract.depositAmount.toLocaleString()}</span>
                </div>
                {contract.paymentSchedule.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="text-sm font-bold text-slate-700 mb-3">Payment Schedule</div>
                    <div className="space-y-2">
                      {contract.paymentSchedule.map((payment, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white rounded-lg px-4 py-2 border border-slate-200">
                          <span className="text-slate-700 font-medium">{payment.milestone}</span>
                          <span className="font-bold text-slate-900">${payment.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t-2 border-slate-200 pt-6">
            <h2 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-4">Terms & Conditions</h2>
            <div className="space-y-3">
              {(contract.terms.length > 0 ? contract.terms : [
                'All work will be completed in a professional and workmanlike manner in accordance with industry standards.',
                'The Contractor will obtain all necessary permits and licenses required for the work.',
                'The Client will provide clear access to the work area and adequate parking for vehicles.',
                'Payment terms: Deposit due upon signing, progress payments as outlined above, final payment due upon completion.',
                'Any changes to the scope of work must be approved in writing and may result in additional charges.',
                'The Contractor is not responsible for damage to landscaping, underground utilities, or pre-existing conditions.',
                'In the event of inclement weather, the completion date may be extended accordingly.',
                'This contract may be terminated by either party with 48 hours written notice.'
              ]).map((term, idx) => (
                <div key={idx} className="flex items-start gap-3 leading-relaxed">
                  <span className="text-blue-600 font-bold shrink-0 w-6">{idx + 1}.</span>
                  <span className="text-slate-700 text-sm">{term}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-slate-200 pt-6">
            <h2 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-4">Warranty Information</h2>
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-6 rounded-r-lg">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-emerald-600 shrink-0 mt-1" size={24} />
                <div>
                  <div className="font-bold text-emerald-900 text-lg mb-2">Workmanship Warranty</div>
                  <p className="text-emerald-800 leading-relaxed">
                    {contract.warranty || 'The Contractor warrants all workmanship for a period of 10 years from the date of completion. This warranty covers defects in installation and workmanship. Materials are covered under manufacturer\'s warranty.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-slate-200 pt-8 mt-8">
            <h2 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-6">Agreement Signatures</h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-24 border-b-2 border-slate-900 flex items-end pb-2">
                  {contract.clientSignature && (
                    <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>{contract.leadName}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">Client Signature</div>
                  <div className="text-sm text-slate-600">
                    {contract.signedDate ? (
                      <span>Signed on {new Date(contract.signedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    ) : (
                      <span>Date: _____________________</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-24 border-b-2 border-slate-900 flex items-end pb-2">
                  {contract.contractorSignature && (
                    <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>Authorized Representative</span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">Contractor Signature</div>
                  <div className="text-sm text-slate-600">
                    {contract.signedDate ? (
                      <span>Signed on {new Date(contract.signedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    ) : (
                      <span>Date: _____________________</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 italic pt-6 border-t border-slate-200">
            This contract is legally binding. Both parties should retain a copy for their records.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDocument;
