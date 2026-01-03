import React from 'react';
import { EdgeType } from '../types';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import { Check } from 'lucide-react';

interface EdgeTypeSelectorProps {
  selectedType: EdgeType | null;
  onSelectType: (type: EdgeType | null) => void;
  edgeCounts: Record<EdgeType, number>;
  unlabeledCount: number;
}

const EdgeTypeSelector: React.FC<EdgeTypeSelectorProps> = ({
  selectedType,
  onSelectType,
  edgeCounts,
  unlabeledCount
}) => {
  const edgeTypes: EdgeType[] = ['Ridge', 'Hip', 'Valley', 'Eave', 'Rake', 'Penetration'];

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-lg">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Select Edge Type</h3>
        <p className="text-sm text-slate-600">Click a type, then click edges on the map to label them</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {edgeTypes.map((type) => {
          const config = EDGE_TYPE_CONFIGS[type];
          const count = edgeCounts[type] || 0;
          const isSelected = selectedType === type;

          return (
            <button
              key={type}
              onClick={() => onSelectType(isSelected ? null : type)}
              className={`relative px-4 py-3 rounded-lg border-2 transition-all font-semibold text-sm flex flex-col items-center gap-1 ${
                isSelected
                  ? `border-${config.strokeColor} shadow-lg scale-105`
                  : 'border-slate-300 hover:border-slate-400 hover:shadow-md'
              }`}
              style={{
                backgroundColor: isSelected ? config.color : 'white',
                color: isSelected ? 'white' : config.strokeColor,
                borderColor: isSelected ? config.strokeColor : '#cbd5e1'
              }}
            >
              <span className="text-2xl">{config.icon}</span>
              <span>{config.label}</span>
              <span className="text-xs opacity-90">({count})</span>
              {isSelected && (
                <div className="absolute top-1 right-1 bg-white rounded-full p-0.5">
                  <Check size={14} style={{ color: config.strokeColor }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onSelectType(null)}
        className={`w-full px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
          selectedType === null
            ? 'bg-slate-700 text-white border-slate-800 shadow-lg'
            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:shadow-md'
        }`}
      >
        Leave Unlabeled {unlabeledCount > 0 && `(${unlabeledCount})`}
      </button>

      {selectedType && (
        <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-medium mb-1">
            {EDGE_TYPE_CONFIGS[selectedType].label} Mode Active
          </p>
          <p className="text-xs text-blue-700">
            {EDGE_TYPE_CONFIGS[selectedType].description}
          </p>
          <button
            onClick={() => onSelectType(null)}
            className="mt-2 text-xs text-blue-700 hover:text-blue-900 underline"
          >
            Exit Selection Mode
          </button>
        </div>
      )}
    </div>
  );
};

export default EdgeTypeSelector;
