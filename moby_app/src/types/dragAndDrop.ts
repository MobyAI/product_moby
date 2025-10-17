export interface DragState {
  type: "start" | "end";
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface RangeMarkerProps {
  type: "start" | "end";
  position: number;
  customStartIndex: number;
  customEndIndex: number;
  onDragStart: (type: "start" | "end", e: React.MouseEvent<Element>) => void;
  isDragging: boolean;
}

export interface DropZoneProps {
  index: number;
  isPlaying: boolean;
  dragging: DragState | null;
  hoveredDropZone: number | null;
  customStartIndex: number;
  customEndIndex: number;
  onDragStart: (type: "start" | "end", e: React.MouseEvent<Element>) => void;
  isDraggingMarker: (type: "start" | "end") => boolean;
}

export interface DraggedMarkerProps {
  dragging: DragState | null;
  dragPosition: Position;
}
