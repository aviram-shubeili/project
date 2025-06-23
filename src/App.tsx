import { useState, useCallback } from "react";
import LineChart from "./components/LineChart";
import { TrendingUp, RotateCcw, Plus } from "lucide-react";

interface Annotation {
  id: string;
  value: number;
  color: string;
}

// Generate dummy data
const generateDummyData = (length: number, offset: number = 0): number[] => {
  const data: number[] = [];
  let value = 50 + offset;

  for (let i = 0; i < length; i++) {
    // Simulate some interesting patterns
    const noise = (Math.random() - 0.5) * 5;
    const trend = Math.sin((i + offset) * 0.02) * 10;
    const spike = Math.sin((i + offset) * 0.1) * 3;

    value += noise + trend * 0.1 + spike * 0.1;
    value = Math.max(0, Math.min(100, value)); // Keep within bounds
    data.push(parseFloat(value.toFixed(2)));
  }

  return data;
};

const ANNOTATION_COLORS = [
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#EF4444", // red
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F97316", // orange
  "#EC4899", // pink
];

function App() {
  const [data1] = useState(() => generateDummyData(500, 0));
  const [data2] = useState(() => generateDummyData(500, 100));
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentPosition, setCurrentPosition] = useState(250);
  const [zoom, setZoom] = useState(2);
  const [panX, setPanX] = useState(0.5);

  const handleAnnotationDrag = useCallback(
    (id: string, value: number) => {
      setAnnotations((prev) =>
        prev.map((annotation) =>
          annotation.id === id
            ? {
                ...annotation,
                value: Math.max(
                  0,
                  Math.min(data1.length - 1, Math.round(value))
                ),
              }
            : annotation
        )
      );
    },
    [data1.length]
  );

  const handleCurrentPositionDrag = useCallback(
    (value: number) => {
      setCurrentPosition(
        Math.max(0, Math.min(data1.length - 1, Math.round(value)))
      );
    },
    [data1.length]
  );

  const handleAddAnnotation = useCallback(() => {
    const visibleDataPoints = Math.ceil(data1.length / zoom);
    const startIndex = Math.floor(panX * (data1.length - visibleDataPoints));
    const centerPosition = startIndex + Math.floor(visibleDataPoints / 2);

    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}`,
      value: centerPosition,
      color: ANNOTATION_COLORS[annotations.length % ANNOTATION_COLORS.length],
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
  }, [data1.length, zoom, panX, annotations.length]);

  const handleInteractiveZoom = useCallback(
    (delta: number, centerX: number) => {
      const zoomFactor = delta > 0 ? 1.2 : 0.8;
      const newZoom = Math.max(1, Math.min(10, zoom * zoomFactor));

      if (newZoom === zoom) return; // No change needed

      // Calculate new panX to zoom towards the cursor position
      const visibleDataPoints = Math.ceil(data1.length / zoom);
      const newVisibleDataPoints = Math.ceil(data1.length / newZoom);
      const currentStartIndex = Math.floor(
        panX * Math.max(1, data1.length - visibleDataPoints)
      );

      // Calculate the relative position of the cursor within the current view
      const cursorRelativePosition =
        (centerX - currentStartIndex) / visibleDataPoints;

      // Calculate new start index to keep the cursor position stable
      const newStartIndex = Math.max(
        0,
        Math.min(
          data1.length - newVisibleDataPoints,
          centerX - newVisibleDataPoints * cursorRelativePosition
        )
      );

      const maxStartIndex = Math.max(1, data1.length - newVisibleDataPoints);
      const newPanX = maxStartIndex > 0 ? newStartIndex / maxStartIndex : 0;

      setZoom(newZoom);
      setPanX(Math.max(0, Math.min(1, newPanX)));
    },
    [zoom, panX, data1.length]
  );

  const handleInteractivePan = useCallback(
    (deltaX: number) => {
      const visibleDataPoints = Math.ceil(data1.length / zoom);
      const maxStartIndex = Math.max(0, data1.length - visibleDataPoints);

      if (maxStartIndex <= 0) return; // Can't pan if everything is visible

      const currentStartIndex = Math.floor(panX * maxStartIndex);
      const newStartIndex = Math.max(
        0,
        Math.min(maxStartIndex, currentStartIndex + deltaX)
      );
      const newPanX = newStartIndex / maxStartIndex;

      setPanX(newPanX);
    },
    [zoom, panX, data1.length]
  );

  const handleReset = useCallback(() => {
    setZoom(2);
    setPanX(0.5);
    setCurrentPosition(250);
  }, []);

  const currentValue1 = data1[currentPosition] || 0;
  const currentValue2 = data2[currentPosition] || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">
              Interactive Data Analyzer
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Analyze measurement data with interactive annotations, zoom
            controls, and real-time positioning
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">
              Total Points
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {data1.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">
              Current Position
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {currentPosition}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">
              Chart 1 Value
            </div>
            <div className="text-2xl font-bold text-green-600">
              {currentValue1.toFixed(2)} mm
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">
              Chart 2 Value
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {currentValue2.toFixed(2)} mm
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Zoom Level</div>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>

        {/* Interactive Instructions */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-blue-800">
                <div className="text-sm font-medium">Interactive Controls:</div>
              </div>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <div>
                  • <strong>Zoom:</strong> Hold Ctrl + scroll mouse wheel
                </div>
                <div>
                  • <strong>Pan:</strong> Click and drag horizontally on the
                  chart
                </div>
                <div>
                  • <strong>Annotations:</strong> Drag the vertical lines to
                  move them
                </div>
                <div>
                  • <strong>Add Annotation:</strong> Double-click on either
                  chart
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={handleAddAnnotation}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                <span>Add Annotation</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <RotateCcw size={16} />
                <span>Reset View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-8">
          {/* Chart 1 */}
          <div className="relative z-10">
            <LineChart
              data={data1}
              annotations={annotations}
              currentPosition={currentPosition}
              zoom={zoom}
              panX={panX}
              onAnnotationDrag={handleAnnotationDrag}
              onCurrentPositionDrag={handleCurrentPositionDrag}
              onInteractiveZoom={handleInteractiveZoom}
              onInteractivePan={handleInteractivePan}
              onAddAnnotation={handleAddAnnotation}
              hideXAxis={true}
              hideTitle={true}
              instructionsPosition="hidden"
            />
          </div>

          {/* Chart 2 */}
          <div className="relative z-20 -mt-2">
            <LineChart
              data={data2}
              annotations={annotations}
              currentPosition={currentPosition}
              zoom={zoom}
              panX={panX}
              onAnnotationDrag={handleAnnotationDrag}
              onCurrentPositionDrag={handleCurrentPositionDrag}
              onInteractiveZoom={handleInteractiveZoom}
              onInteractivePan={handleInteractivePan}
              onAddAnnotation={handleAddAnnotation}
              hideXAxis={false}
              hideTitle={true}
              instructionsPosition="bottom"
            />
            <h3 className="text-lg font-semibold text-gray-800 mt-2 text-center">
              Synchronized Measurement Data
            </h3>
          </div>
        </div>

        {/* Annotations List */}
        {annotations.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Active Annotations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: annotation.color }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">
                      Annotation {index + 1}
                    </div>
                    <div className="text-xs text-gray-600">
                      Position: {annotation.value} | Value:{" "}
                      {data1[annotation.value]?.toFixed(2) || 0} mm
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setAnnotations((prev) =>
                        prev.filter((a) => a.id !== annotation.id)
                      )
                    }
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
