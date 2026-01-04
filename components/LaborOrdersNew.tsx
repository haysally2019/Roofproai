import React from 'react';
import { HardHat } from 'lucide-react';

const LaborOrdersNew: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <HardHat size={64} className="mx-auto text-orange-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Labor Orders</h2>
        <p className="text-slate-600 mb-4">Manage crew schedules and work orders</p>
        <p className="text-sm text-slate-500">Full labor management with database integration coming soon</p>
      </div>
    </div>
  );
};

export default LaborOrdersNew;
