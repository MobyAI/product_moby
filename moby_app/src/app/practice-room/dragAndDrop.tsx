import React from "react";
import { ArrowBigRight, ArrowBigLeft } from "lucide-react";
import {
  RangeMarkerProps,
  DropZoneProps,
  DraggedMarkerProps,
} from "@/types/dragAndDrop";

// --- Range Marker ---
export const RangeMarker: React.FC<RangeMarkerProps> = ({
  type,
  position,
  customStartIndex,
  customEndIndex,
  onDragStart,
  isDragging,
}) => {
  const isStart = type === "start";
  const shouldRender =
    (isStart && position === customStartIndex) ||
    (!isStart && position === customEndIndex);

  if (!shouldRender) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(type, e);
  };

  const sharedClasses = `
    inline-flex items-center gap-1 px-3 py-1 rounded-full
    text-xs font-bold shadow-lg cursor-move select-none
    ${
      isStart
        ? "bg-green-500 hover:bg-green-600"
        : "bg-red-500 hover:bg-red-600"
    } 
    text-white ${isDragging ? "opacity-30" : ""}
  `;

  return (
    <div
      className={`absolute z-50 ${
        isStart
          ? "top-5 -translate-y-1/2 -left-24"
          : "bottom-14 translate-y-full -right-22"
      }`}
    >
      <div onMouseDown={handleMouseDown} className={sharedClasses}>
        {isStart ? (
          <>
            {type.toUpperCase()}
            <ArrowBigRight className="w-4 h-4" />
          </>
        ) : (
          <>
            <ArrowBigLeft className="w-4 h-4" />
            {type.toUpperCase()}
          </>
        )}
      </div>
    </div>
  );
};

// --- Drop Zones ---
export const StartDropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(
  ({ index, isPlaying, dragging, hoveredDropZone, customEndIndex }, ref) => {
    const isDraggingStart = dragging?.type === "start";
    const isHovered = hoveredDropZone === index && isDraggingStart;
    const isValid = index < customEndIndex;
    const isActive = !isPlaying && isDraggingStart && isValid;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        className="absolute top-0 -left-27 z-[90]"
        style={{ width: 100, height: 40 }}
      >
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            isValid ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`h-full w-full rounded flex items-center justify-center ${
              isHovered
                ? "bg-green-100 border-2 border-green-400 border-dashed"
                : ""
            }`}
          >
            {isHovered && (
              <span className="text-xs text-green-600 font-medium">
                Drop here
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export const EndDropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(
  ({ index, isPlaying, dragging, hoveredDropZone, customStartIndex }, ref) => {
    const isDraggingEnd = dragging?.type === "end";
    const isHovered = hoveredDropZone === index && isDraggingEnd;
    const isValid = index > customStartIndex;
    const isActive = !isPlaying && isDraggingEnd && isValid;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        className="absolute bottom-0 -right-27 z-[90]"
        style={{ width: 100, height: 40 }}
      >
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            isValid ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`h-full w-full rounded flex items-center justify-center ${
              isHovered
                ? "bg-red-100 border-2 border-red-400 border-dashed"
                : ""
            }`}
          >
            {isHovered && (
              <span className="text-xs text-red-600 font-medium">
                Drop here
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

// --- Floating Drag Marker ---
export const DraggedMarker: React.FC<DraggedMarkerProps> = ({
  dragging,
  dragPosition,
}) => {
  if (!dragging) return null;

  const width = 80;
  const height = 30;
  const centerX = width / 2;
  const centerY = height / 2;

  const style = {
    left: dragPosition.x - centerX - dragging.offsetX,
    top: dragPosition.y - centerY - dragging.offsetY,
  };

  return (
    <div className="fixed pointer-events-none z-[100]" style={style}>
      <div
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-xl ${
          dragging.type === "start"
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        }`}
      >
        {dragging.type === "start" ? (
          <>
            {dragging.type.toUpperCase()}
            <ArrowBigRight className="w-4 h-4" />
          </>
        ) : (
          <>
            <ArrowBigLeft className="w-4 h-4" />
            {dragging.type.toUpperCase()}
          </>
        )}
      </div>
    </div>
  );
};
