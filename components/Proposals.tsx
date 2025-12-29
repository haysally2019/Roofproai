import React from 'react';
import { ScrollText, Plus, Search, Filter } from 'lucide-react';

const Proposals: React.FC = () => {
  return (
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ScrollText className="text-blue-600" />
            Proposals
          </h1>
          <p className="text-slate-500 mt-1">Create and send professional proposals</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus size={20} />
          New Proposal
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search proposals..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
          <Filter size={20} />
          Filter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <ScrollText className="mx-auto text-slate-300 mb-4" size={64} />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No Proposals Yet</h3>
        <p className="text-slate-500 mb-6">Get started by creating your first proposal</p>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Create First Proposal
        </button>
      </div>
    </div>
  );
};

export default Proposals;
