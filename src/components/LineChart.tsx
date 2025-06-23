import React, { useRef, useState, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

interface Annotation {
  id: string;
  value: number;
  color: string;
}

interface LineChartProps {
  data: number[];
  annotations: Annotation[];
  currentPosition: number;
  zoom: number;
  panX: number;
  onAnnotationDrag: (id: string, value: number) => void;
  onCurrentPositionDrag: (value: number) => void;
  onInteractiveZoom: (delta: number, centerX: number) => void;
  onInteractivePan: (deltaX: number) => void;
  onAddAnnotation: () => void;
  hideXAxis?: boolean; // New prop to hide X-axis
  hideTitle?: boolean; // New prop to hide chart title
  instructionsPosition?: "top" | "bottom" | "hidden"; // New prop to control instructions position
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  annotations,
  currentPosition,
  zoom,
  panX,
  onAnnotationDrag,
  onCurrentPositionDrag,
  onInteractiveZoom,
  onInteractivePan,
  onAddAnnotation,
  hideXAxis = false,
  hideTitle = false,
  instructionsPosition = "top",
}) => {
  const chartRef = useRef<ChartJS<"line">>(null);
  const [dragging, setDragging] = useState<{
    type: "annotation" | "current";
    id?: string;
  } | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Function to get the closest annotation to a given x position
  const getClosestAnnotation = useCallback(
    (x: number) => {
      const chart = chartRef.current;
      if (!chart) return null;

      const dataX = chart.scales.x.getValueForPixel(x);
      if (dataX == null) return null;

      // Check current position first
      if (Math.abs(currentPosition - dataX) < 10) {
        return {
          type: "current" as const,
          id: "currentPosition",
          name: "Current Position",
          position: currentPosition,
          value: data[currentPosition] || 0,
        };
      }

      // Check annotations
      for (const [index, annotation] of annotations.entries()) {
        if (Math.abs(annotation.value - dataX) < 10) {
          return {
            type: "annotation" as const,
            id: annotation.id,
            name: `Annotation ${index + 1}`,
            position: annotation.value,
            value: data[annotation.value] || 0,
          };
        }
      }

      return null;
    },
    [annotations, currentPosition, data]
  );

  // Mouse event handlers for drag functionality
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const chart = chartRef.current;
      if (!chart) return;

      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;

      const closest = getClosestAnnotation(x);
      if (closest) {
        setDragging(closest);
        chart.canvas.style.cursor = "grabbing";
        console.log("Started dragging:", closest);
      }
    },
    [getClosestAnnotation]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const chart = chartRef.current;
      if (!chart) return;

      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;

      if (dragging) {
        // Perform drag
        const dataX = chart.scales.x.getValueForPixel(x);
        if (dataX != null) {
          const newValue = Math.max(
            0,
            Math.min(data.length - 1, Math.round(dataX))
          );

          if (dragging.type === "current") {
            onCurrentPositionDrag(newValue);
            console.log("Dragging current position to:", newValue);
          } else if (dragging.type === "annotation" && dragging.id) {
            onAnnotationDrag(dragging.id, newValue);
            console.log("Dragging annotation", dragging.id, "to:", newValue);
          }
        }
        // Hide tooltip while dragging
        setTooltip({ visible: false, x: 0, y: 0, content: "" });
      } else {
        // Check hover and show tooltip
        const closest = getClosestAnnotation(x);
        if (closest) {
          chart.canvas.style.cursor = "grab";
          // Show tooltip
          const tooltipContent = `${closest.name}\nPosition: ${
            closest.position
          }\nValue: ${closest.value.toFixed(2)} mm`;
          setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY - 10,
            content: tooltipContent,
          });
        } else {
          chart.canvas.style.cursor = "default";
          // Hide tooltip
          setTooltip({ visible: false, x: 0, y: 0, content: "" });
        }
      }
    },
    [
      dragging,
      getClosestAnnotation,
      onAnnotationDrag,
      onCurrentPositionDrag,
      data.length,
      setTooltip,
    ]
  );

  const handleMouseUp = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (dragging) {
      setDragging(null);
      chart.canvas.style.cursor = "default";
      console.log("Stopped dragging");
    }
    // Hide tooltip on mouse up
    setTooltip({ visible: false, x: 0, y: 0, content: "" });
  }, [dragging, setTooltip]);

  const handleMouseLeave = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    setDragging(null);
    chart.canvas.style.cursor = "default";
    // Hide tooltip when leaving the chart area
    setTooltip({ visible: false, x: 0, y: 0, content: "" });
  }, [setTooltip]);

  // Interactive zoom handler (Ctrl + Mouse Wheel)
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      const chart = chartRef.current;
      if (!chart) return;

      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const dataX = chart.scales.x.getValueForPixel(x);

      if (dataX != null) {
        onInteractiveZoom(-event.deltaY, dataX);
      }
    },
    [onInteractiveZoom]
  );

  // Interactive pan handler (Mouse drag)
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);

  const handlePanStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const chart = chartRef.current;
      if (!chart) return;

      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;

      // Check if we're starting a pan (not on an annotation)
      const closest = getClosestAnnotation(x);
      if (!closest) {
        setIsPanning(true);
        setPanStartX(event.clientX);
        chart.canvas.style.cursor = "grabbing";
      }
    },
    [getClosestAnnotation]
  );

  const handlePanMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isPanning) {
        event.preventDefault();
        const deltaPixels = event.clientX - panStartX;
        const chart = chartRef.current;
        if (!chart) return;

        // Convert pixel delta to data index delta
        const chartArea = chart.chartArea;
        if (!chartArea) return;

        const chartWidth = chartArea.right - chartArea.left;
        const visibleDataPoints = Math.ceil(data.length / zoom);
        const pixelsPerDataPoint = chartWidth / visibleDataPoints;
        const dataIndexDelta = -deltaPixels / pixelsPerDataPoint; // Negative for natural panning direction

        onInteractivePan(dataIndexDelta);
        setPanStartX(event.clientX);
      }
    },
    [isPanning, panStartX, onInteractivePan, data.length, zoom]
  );

  const handlePanEnd = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      const chart = chartRef.current;
      if (chart) {
        chart.canvas.style.cursor = "default";
      }
    }
  }, [isPanning]);

  // Double-click to add annotation
  const handleDoubleClick = useCallback(() => {
    onAddAnnotation();
  }, [onAddAnnotation]);

  // Combined mouse down handler
  const handleCombinedMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      handleMouseDown(event);
      handlePanStart(event);
    },
    [handleMouseDown, handlePanStart]
  );

  // Combined mouse move handler
  const handleCombinedMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      handleMouseMove(event);
      handlePanMove(event);
    },
    [handleMouseMove, handlePanMove]
  );

  // Combined mouse up handler
  const handleCombinedMouseUp = useCallback(() => {
    handleMouseUp();
    handlePanEnd();
  }, [handleMouseUp, handlePanEnd]);

  const chartData = {
    labels: data.map((_, index) => index),
    datasets: [
      {
        label: "Measurement (mm)",
        data: data,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "white",
        pointBorderWidth: 2,
        pointHoverBackgroundColor: "rgb(59, 130, 246)",
        pointHoverBorderColor: "white",
        pointHoverBorderWidth: 2,
        hoverBorderWidth: 2,
      },
    ],
  };

  const annotationConfigs: any = {
    currentPosition: {
      type: "line",
      mode: "vertical",
      scaleID: "x",
      value: currentPosition,
      borderColor:
        dragging?.type === "current" ? "rgb(220, 38, 38)" : "rgb(239, 68, 68)",
      borderWidth: dragging?.type === "current" ? 5 : 4,
      borderDash: [8, 4],
      label: {
        content: `Current: ${currentPosition}`,
        enabled: true,
        position: "top",
        backgroundColor: "rgb(239, 68, 68)",
        color: "white",
        font: {
          size: 11,
          weight: "bold",
        },
        padding: 4,
        cornerRadius: 4,
      },
      adjustScaleRange: false,
      drawTime: "afterDatasetsDraw",
      z: 100,
    },
  };

  annotations.forEach((annotation, index) => {
    const isDragging =
      dragging?.type === "annotation" && dragging.id === annotation.id;
    annotationConfigs[annotation.id] = {
      type: "line",
      mode: "vertical",
      scaleID: "x",
      value: annotation.value,
      borderColor: isDragging
        ? (() => {
            const rgb = hexToRgb(annotation.color);
            return rgb
              ? `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(
                  0,
                  rgb.g - 20
                )}, ${Math.max(0, rgb.b - 20)})`
              : annotation.color;
          })()
        : annotation.color,
      borderWidth: isDragging ? 4 : 3,
      label: {
        content: `A${index + 1}: ${annotation.value}`,
        enabled: true,
        position: "top",
        backgroundColor: annotation.color,
        color: "white",
        font: {
          size: 10,
          weight: "bold",
        },
        padding: 3,
        cornerRadius: 3,
      },
      adjustScaleRange: false,
      drawTime: "afterDatasetsDraw",
      z: 99,
    };
  });

  const visibleDataPoints = Math.ceil(data.length / zoom);
  const startIndex = Math.floor(panX * (data.length - visibleDataPoints));
  const endIndex = startIndex + visibleDataPoints;

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 150,
    },
    interaction: {
      intersect: true,
      mode: "point",
      axis: "xy",
    },
    // Reduce interaction with the line dataset to prioritize annotations
    datasets: {
      line: {
        pointHoverRadius: 8,
        pointRadius: 0,
      },
    },
    plugins: {
      legend: {
        display: !hideTitle,
        position: "top",
        labels: {
          font: {
            size: 14,
            weight: "bold",
          },
          color: "#374151",
          usePointStyle: true,
          pointStyle: "line",
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(59, 130, 246, 0.3)",
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
        // Reduce tooltip sensitivity
        filter: (tooltipItem) => {
          // Only show tooltip when not near annotations
          const mouseX = tooltipItem.parsed.x;
          const isNearAnnotation =
            annotations.some((ann) => Math.abs(ann.value - mouseX) < 5) ||
            Math.abs(currentPosition - mouseX) < 5;
          return !isNearAnnotation;
        },
        callbacks: {
          title: (context) => {
            // Check if context array has elements before accessing
            if (context.length > 0) {
              return `Index: ${context[0].label}`;
            }
            return "";
          },
          label: (context) => `Value: ${context.parsed.y.toFixed(2)} mm`,
        },
      },
      annotation: {
        annotations: annotationConfigs,
        // Ensure annotations are drawn on top and handle events first
        clip: false,
        // Enable interaction with annotations
        interaction: {
          intersect: false,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: !hideXAxis,
          text: "Index",
          font: {
            size: 14,
            weight: "bold",
          },
          color: "#374151",
        },
        min: startIndex,
        max: endIndex,
        grid: {
          color: hideXAxis ? "transparent" : "rgba(156, 163, 175, 0.3)",
          lineWidth: 1,
        },
        ticks: {
          display: !hideXAxis,
          color: "#6B7280",
          font: {
            size: 12,
          },
          maxTicksLimit: 10,
        },
      },
      y: {
        title: {
          display: true,
          text: "Value (mm)",
          font: {
            size: 14,
            weight: "bold",
          },
          color: "#374151",
        },
        grid: {
          color: "rgba(156, 163, 175, 0.3)",
          lineWidth: 1,
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 12,
          },
          callback: (value) => `${value} mm`,
        },
      },
    },
    // Ensure events are handled properly for drag interactions
    events: [
      "mousemove",
      "mouseout",
      "click",
      "touchstart",
      "touchmove",
      "touchend",
    ],
  };

  return (
    <div
      className={`w-full bg-white border border-gray-200 relative transition-shadow ${
        hideXAxis
          ? "h-80 p-4 pb-2 rounded-t-lg rounded-b-none border-b-0 shadow-sm hover:shadow-md"
          : "h-96 p-4 pt-2 rounded-b-lg rounded-t-none border-t-0 shadow-sm hover:shadow-md"
      }`}
    >
      {instructionsPosition !== "hidden" && (
        <div
          className={`absolute ${
            instructionsPosition === "bottom" ? "bottom-2" : "top-2"
          } right-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded z-10`}
        >
          💡 Ctrl+Scroll: Zoom | Drag: Pan | Double-click: Add annotation
        </div>
      )}

      {/* Custom Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y,
            whiteSpace: "pre-line",
          }}
        >
          {tooltip.content}
        </div>
      )}

      <div
        onMouseDown={handleCombinedMouseDown}
        onMouseMove={handleCombinedMouseMove}
        onMouseUp={handleCombinedMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        style={{ width: "100%", height: "100%" }}
      >
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
};

export default LineChart;
