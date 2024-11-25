import { useState, useEffect, useCallback, useRef } from "react";
import { Point, ModeEnum, options } from "@/lib/utils";
import { useStrokesStore } from "@/store/strokesStore";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "@/lib/utils";
import { BoundingBox, calculateBoundingBox, drawSelectionBox, calculateGlobalBoundingBox } from "./selectionBox";

export const useCanvas = () => {
  const [points, setPoints] = useState<Point[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [undoneStrokes, setUndoneStrokes] = useState([]);  // Track undone strokes for redo functionality

  // A4 dimensions at 300 DPI
  const canvas_width = 2480;  // 210mm * 300/25.4
  const canvas_height = 3508; // 297mm * 300/25.4

  const {
    mode,
    strokes,
    strokeColor,
    strokeWidth,
    strokeTaper,
    scale,
    panOffset,
    addStroke,
    eraseStroke,
    updatePanOffset,
    updateScale,
    canvasRef,
  } = useStrokesStore();

  // Undo function
  const undo = useCallback(() => {
    if (strokes.length === 0) return;
    const lastStroke = strokes[strokes.length - 1];
    setUndoneStrokes((prev) => [...prev, lastStroke]);  // Store in undoneStrokes for redo
    eraseStroke();
  }, [strokes, eraseStroke]);

  // Redo function
  const redo = useCallback(() => {
    if (undoneStrokes.length === 0) return;
    const restoredStroke = undoneStrokes[undoneStrokes.length - 1];
    setUndoneStrokes((prev) => prev.slice(0, -1));  // Remove from undoneStrokes
    addStroke(restoredStroke);
  }, [undoneStrokes, addStroke]);

  // Keyboard event listener for undo (Ctrl + Z) and redo (Ctrl + Shift + Z)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "z") {
        if (event.shiftKey) {
          redo();  // Ctrl + Shift + Z for redo
        } else {
          undo();  // Ctrl + Z for undo
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Rest of the useCanvas hook...

  return {
    points,
    setPoints,
    isPanning,
    setIsPanning,
    startPan,
    setStartPan,
    lastTouchDistance,
    setLastTouchDistance,
    canvas_width,
    canvas_height,
    mode,
    strokes,
    strokeColor,
    strokeWidth,
    strokeTaper,
    scale,
    panOffset,
    updatePanOffset,
    updateScale,
    canvasRef,
    undo,  // Expose undo for external use if needed
    redo,  // Expose redo for external use if needed
  };
};
