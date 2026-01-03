import React, { useState } from 'react';
import { EDGE_TYPE_CONFIGS } from '../lib/edgeTypeConstants';
import { EdgeType } from '../types';
import { X, HelpCircle } from 'lucide-react';

interface EdgeTypesGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const EdgeTypesGuide: React.FC<EdgeTypesGuideProps> = ({ isOpen, onClose }) => {
  const [selectedType, setSelectedType] = useState<EdgeType | null>('Ridge');

  if (!isOpen) return null;

  const edgeTypes: EdgeType[] = ['Ridge', 'Hip', 'Valley', 'Eave', 'Rake', 'Penetration'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <HelpCircle size={28} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Edge Types Guide</h2>
              <p className="text-sm text-slate-600">Learn about different roof edge types</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-6 gap-2 mb-6">
            {edgeTypes.map((type) => {
              const config = EDGE_TYPE_CONFIGS[type];
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-2 rounded-lg border-2 transition-all font-semibold text-sm flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'shadow-lg scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  style={{
                    backgroundColor: isSelected ? config.color : 'white',
                    color: isSelected ? 'white' : config.strokeColor,
                    borderColor: isSelected ? config.strokeColor : '#cbd5e1'
                  }}
                >
                  <span className="text-xl">{config.icon}</span>
                  <span className="text-xs">{config.abbreviation}</span>
                </button>
              );
            })}
          </div>

          {selectedType && (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-slate-50 to-white border-2 border-slate-200 rounded-xl">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg"
                  style={{ backgroundColor: EDGE_TYPE_CONFIGS[selectedType].color }}
                >
                  {EDGE_TYPE_CONFIGS[selectedType].icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {EDGE_TYPE_CONFIGS[selectedType].label}
                  </h3>
                  <p className="text-slate-700 text-lg">
                    {EDGE_TYPE_CONFIGS[selectedType].description}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-900 mb-3 text-lg">Detailed Explanation</h4>
                {selectedType === 'Ridge' && (
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Location:</strong> The horizontal line at the very top of the roof where two roof planes meet.</p>
                    <p><strong>Identification:</strong> Usually the highest point of the roof, running horizontally along the length of the building.</p>
                    <p><strong>Common on:</strong> Gable roofs, hip roofs, and most traditional roof designs.</p>
                    <p><strong>Examples:</strong> A typical house with a peaked roof has one main ridge line running down the center.</p>
                  </div>
                )}
                {selectedType === 'Hip' && (
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Location:</strong> Diagonal lines that run from the ridge down to the eaves at an external corner.</p>
                    <p><strong>Identification:</strong> Forms where two sloping roof planes meet at an outward angle (135-160 degrees).</p>
                    <p><strong>Common on:</strong> Hip roofs, where all sides of the roof slope downward.</p>
                    <p><strong>Examples:</strong> The four diagonal lines running from the peak to each corner on a pyramidal roof.</p>
                  </div>
                )}
                {selectedType === 'Valley' && (
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Location:</strong> Internal angles where two roof planes meet, forming a V-shaped channel.</p>
                    <p><strong>Identification:</strong> Creates an inward angle (typically 30-90 degrees) that channels water runoff.</p>
                    <p><strong>Common on:</strong> Complex roofs with dormers, L-shaped houses, or multiple roof sections.</p>
                    <p><strong>Examples:</strong> The line where a dormer roof meets the main roof, or where two wings of an L-shaped house connect.</p>
                  </div>
                )}
                {selectedType === 'Eave' && (
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Location:</strong> The lower horizontal edge where the roof overhangs the wall.</p>
                    <p><strong>Identification:</strong> Typically the lowest edge of the roof, often with gutters attached.</p>
                    <p><strong>Common on:</strong> All roof types - forms the perimeter of the roof at the lowest elevation.</p>
                    <p><strong>Examples:</strong> The edge where you would install gutters, running along the length of the house.</p>
                  </div>
                )}
                {selectedType === 'Rake' && (
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Location:</strong> The sloped edge at the gable end of a roof.</p>
                    <p><strong>Identification:</strong> Runs at an angle from the eave to the ridge on the triangular end of a gable roof.</p>
                    <p><strong>Common on:</strong> Gable roofs and gambrel roofs at the end walls.</p>
                    <p><strong>Examples:</strong> The slanted edges on the triangular ends of a traditional barn or house with gable ends.</p>
                  </div>
                )}
                {selectedType === 'Penetration' && (
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Location:</strong> Openings in the roof surface for chimneys, vents, skylights, etc.</p>
                    <p><strong>Identification:</strong> Usually smaller, isolated features that break through the roof plane.</p>
                    <p><strong>Common on:</strong> All roof types where chimneys, plumbing vents, or skylights are present.</p>
                    <p><strong>Examples:</strong> Chimney openings, vent pipe collars, skylight curbs, solar tube penetrations.</p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
                <h4 className="font-bold text-amber-900 mb-3 text-lg">Tips for Identification</h4>
                <ul className="space-y-2 text-amber-800 list-disc list-inside">
                  {selectedType === 'Ridge' && (
                    <>
                      <li>Look for the highest horizontal line on the roof</li>
                      <li>Usually connects to multiple other edges (hips, rakes, or valleys)</li>
                      <li>Typically runs parallel to the eaves</li>
                    </>
                  )}
                  {selectedType === 'Hip' && (
                    <>
                      <li>Runs diagonally from ridge to eave</li>
                      <li>Forms an external corner (outward angle)</li>
                      <li>Common on roofs without vertical gable ends</li>
                    </>
                  )}
                  {selectedType === 'Valley' && (
                    <>
                      <li>Forms a V-shape or channel</li>
                      <li>Internal angle (inward corner)</li>
                      <li>Critical for water drainage</li>
                    </>
                  )}
                  {selectedType === 'Eave' && (
                    <>
                      <li>Lowest edge of the roof</li>
                      <li>Usually horizontal and parallel to the ground</li>
                      <li>Forms the building perimeter</li>
                    </>
                  )}
                  {selectedType === 'Rake' && (
                    <>
                      <li>Sloped edge at gable ends</li>
                      <li>Connects eave to ridge at an angle</li>
                      <li>Does not have an adjacent roof plane on one side</li>
                    </>
                  )}
                  {selectedType === 'Penetration' && (
                    <>
                      <li>Smaller isolated features</li>
                      <li>Usually circular or rectangular openings</li>
                      <li>Require special flashing and waterproofing</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-200 p-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Got it, start labeling!
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdgeTypesGuide;
