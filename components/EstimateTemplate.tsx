import React from 'react';
import { Estimate, Lead, Company } from '../types';

interface EstimateTemplateProps {
  estimate: Estimate;
  lead: Lead;
  company: Company;
}

export const EstimateTemplate = React.forwardRef<HTMLDivElement, EstimateTemplateProps>(
  ({ estimate, lead, company }, ref) => {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    return (
      <div ref={ref} className="bg-white p-12 max-w-4xl mx-auto" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="mb-8 pb-6 border-b-4 border-slate-900 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">{estimate.name || 'ROOFING PROPOSAL'}</h1>
            <p className="text-slate-600 text-lg">Prepared for {lead.name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900 mb-1">{company.name}</div>
            {company.address && <p className="text-sm text-slate-600">{company.address}</p>}
            {company.phone && <p className="text-sm text-slate-600">{company.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Project Information</h3>
            <div className="space-y-1">
              <p className="text-slate-800"><span className="font-semibold">Property Address:</span><br/>{lead.address}</p>
              <p className="text-slate-800"><span className="font-semibold">Phone:</span> {lead.phone}</p>
              {lead.email && <p className="text-slate-800"><span className="font-semibold">Email:</span> {lead.email}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Estimate Details</h3>
            <div className="space-y-1">
              <p className="text-slate-800"><span className="font-semibold">Date Prepared:</span> {formatDate(estimate.createdAt)}</p>
              <p className="text-slate-800"><span className="font-semibold">Status:</span> {estimate.status || 'Draft'}</p>
              <p className="text-slate-800"><span className="font-semibold">Project Type:</span> {lead.projectType}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Scope of Work</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left py-3 px-4 font-semibold">Description</th>
                <th className="text-center py-3 px-4 font-semibold w-20">Qty</th>
                <th className="text-center py-3 px-4 font-semibold w-24">Unit</th>
                <th className="text-right py-3 px-4 font-semibold w-28">Rate</th>
                <th className="text-right py-3 px-4 font-semibold w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="py-3 px-4 text-slate-800">{item.description}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{item.quantity}</td>
                  <td className="py-3 px-4 text-center text-slate-700 uppercase text-sm">{item.unit}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-2">
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(estimate.subtotal)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Tax:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(estimate.tax)}</span>
            </div>
            <div className="flex justify-between py-3 bg-slate-900 text-white px-4 rounded">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-xl">{formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </div>

        <div className="mb-8 p-4 bg-slate-50 rounded border border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Terms & Conditions</h3>
          <div className="text-xs text-slate-600 space-y-1">
            <p>• This estimate is valid for 30 days from the date of preparation.</p>
            <p>• A 50% deposit is required to schedule work.</p>
            <p>• Final payment is due upon completion of work.</p>
            <p>• All materials are guaranteed per manufacturer specifications.</p>
            <p>• Workmanship is guaranteed for one year from completion date.</p>
          </div>
        </div>

        {estimate.signature && (
          <div className="pt-6 border-t border-slate-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Customer Authorization</h3>
            <div className="flex justify-between items-end">
              <div>
                <img src={estimate.signature} alt="Signature" className="h-20 mb-2 border-b-2 border-slate-900" />
                <p className="text-sm text-slate-600">Customer Signature</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 border-b-2 border-slate-300 pb-1 mb-2 min-w-[200px] text-center">
                  {formatDate(estimate.createdAt)}
                </p>
                <p className="text-sm text-slate-600 text-center">Date</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <p>Generated by {company.name} - Professional Roofing Services</p>
        </div>
      </div>
    );
  }
);

EstimateTemplate.displayName = 'EstimateTemplate';
