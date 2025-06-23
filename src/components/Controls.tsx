import React from 'react';
import { ZoomIn, ZoomOut, Plus, RotateCcw } from 'lucide-react';

interface ControlsProps {
  zoom: number;
  panX: number;
  onZoomChange: (zoom: number) => void;
  onPanXChange: (panX: number) => void;
  onAddAnnotation: () => void;
  onReset: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  zoom,
  panX,
  onZoomChange,
  onPanXChange,
  onAddAnnotation,
  onReset,
}) => {
  const zoomPercentage = Math.round(zoom * 100);

  const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onZoomChange(value);
  };

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(100, Math.min(1000, parseInt(e.target.value) || 100));
    onZoomChange(value / 100);
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onPanXChange(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Chart Controls</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Zoom Controls */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Zoom Level
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onZoomChange(Math.max(1, zoom - 0.25))}
              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="1"
                max="10"
                step="0.25"
                value={zoom}
                onChange={handleZoomSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <button
              onClick={() => onZoomChange(Math.min(10, zoom + 0.25))}
              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={zoomPercentage}
              onChange={handleZoomInputChange}
              min="100"
              max="1000"
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        </div>

        {/* Pan Controls */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Horizontal Pan
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={panX}
              onChange={handlePanChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-xs text-gray-600 text-center">
              {Math.round(panX * 100)}% across data
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Actions
          </label>
          <div className="flex flex-col space-y-2">
            <button
              onClick={onAddAnnotation}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus size={16} />
              <span>Add Annotation</span>
            </button>
            <button
              onClick={onReset}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
            >
              <RotateCcw size={16} />
              <span>Reset View</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;