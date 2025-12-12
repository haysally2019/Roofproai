
import React, { useState } from 'react';
import { PriceBookItem } from '../types';
import { Search, Tag, Plus, TrendingUp } from 'lucide-react';

interface PriceBookProps {
  items: PriceBookItem[];
}

const PriceBook: React.FC<PriceBookProps> = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [bookItems, setBookItems] = useState(items);

  const categories = ['All', 'Material', 'Labor', 'Permit', 'Other'];

  const filteredItems = bookItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
           <h2 className="text-xl font-bold text-slate-800">Price Book & Materials</h2>
           <p className="text-sm text-slate-500">Manage costs, margins, and item list</p>
        </div>
        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search items..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-64"
                />
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium">
                <Plus size={16} /> Add Item
            </button>
        </div>
      </div>

      <div className="border-b border-slate-200 px-6 py-2 bg-white flex gap-2 overflow-x-auto">
        {categories.map(cat => (
            <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeCategory === cat ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                {cat}
            </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                <tr>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Unit</th>
                    <th className="px-6 py-4">Cost (Avg)</th>
                    <th className="px-6 py-4">Price (Retail)</th>
                    <th className="px-6 py-4">Margin</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                    const margin = ((item.price - item.cost) / item.price * 100);
                    return (
                        <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${item.category === 'Labor' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                    {item.category}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500">{item.unit}</td>
                            <td className="px-6 py-4 text-slate-600">${item.cost.toFixed(2)}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">${item.price.toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <span className={`flex items-center gap-1 text-xs font-medium ${margin > 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    <TrendingUp size={12}/> {margin.toFixed(0)}%
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriceBook;
