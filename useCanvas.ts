import { useState, useEffect, useCallback } from "react";
import { Point, ModeEnum, options } from "@/lib/utils";
import { useStrokesStore } from "@/store/strokesStore";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "@/lib/utils";

export const useCanvas = () => {
  const [points, setPoints] = useState<Point[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const canvas_width = 1920;
  const canvas_height = 1080;

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
  } = useStrokesStore((state) => state);

  useEffect(() => {
    options.size = strokeWidth;
    options.end.taper = strokeTaper;
  }, [strokeWidth, strokeTaper]);

  const isPointInCanvas = useCallback((x: number, y: number) => {
    return x >= 0 && x <= canvas_width && y >= 0 && y <= canvas_height;
  }, []);

  const getAdjustedCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left - panOffset.x) / scale;
      const y = (clientY - rect.top - panOffset.y) / scale;
      return {
        x: Math.max(0, Math.min(x, canvas_width)),
        y: Math.max(0, Math.min(y, canvas_height)),
      };
    },
    [canvasRef, panOffset, scale]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { x, y } = getAdjustedCoordinates(e.clientX, e.clientY);

      if (mode === ModeEnum.SCROLL) {
        setIsPanning(true);
        setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      } else if (isPointInCanvas(x, y)) {
        setPoints([{ x, y, pressure: e.pressure }]);
      }
    },
    [mode, panOffset, getAdjustedCoordinates, isPointInCanvas]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (mode === ModeEnum.SCROLL && isPanning) {
        const newPanX = e.clientX - startPan.x;
        const newPanY = e.clientY - startPan.y;
        
        const maxPanX = (canvas_width * scale - window.innerWidth) / 2 + 100;
        const maxPanY = (canvas_height * scale - window.innerHeight) / 2 + 100;
        
        updatePanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, newPanX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, newPanY)),
        });
        return;
      }

      if (e.buttons !== 1) return;
      const { x, y } = getAdjustedCoordinates(e.clientX, e.clientY);
      
      if (isPointInCanvas(x, y)) {
        setPoints((prev) => [...prev, { x, y, pressure: e.pressure }]);
      }
    },
    [mode, isPanning, startPan, updatePanOffset, getAdjustedCoordinates, isPointInCanvas, scale]
  );

  const handlePointerUp = useCallback(() => {
    if (mode === ModeEnum.SCROLL) {
      setIsPanning(false);
      return;
    }

    if (points.length > 0) {
      const pointArray = points.map((point) => [
        point.x,
        point.y,
        point.pressure,
      ]);
      const newStrokePath = getSvgPathFromStroke(getStroke(pointArray, options));

      if (mode === ModeEnum.ERASE) {
        const erasePoints = points.map((p) => [p.x, p.y]);
        eraseStroke(erasePoints);
      } else if (mode === ModeEnum.DRAW) {
        addStroke({
          type: "draw",
          path: newStrokePath,
          color: strokeColor,
        });
      }
    }
    setPoints([]);
  }, [mode, points, strokeColor, addStroke, eraseStroke]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey) {
        const delta = e.deltaY * -0.01;
        const minScale = 0.5;
        const maxScale = 2.0;
        const newScale = Math.min(Math.max(scale + delta, minScale), maxScale);
        const scaleFactor = newScale / scale;

        const newPanX = mouseX - (mouseX - panOffset.x) * scaleFactor;
        const newPanY = mouseY - (mouseY - panOffset.y) * scaleFactor;

        const maxPanX = (canvas_width * newScale - window.innerWidth) / 2 + 100;
        const maxPanY = (canvas_height * newScale - window.innerHeight) / 2 + 100;

        updateScale(newScale);
        updatePanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, newPanX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, newPanY)),
        });
      } else {
        const newPanX = panOffset.x - e.deltaX;
        const newPanY = panOffset.y - e.deltaY;
        
        const maxPanX = (canvas_width * scale - window.innerWidth) / 2 + 100;
        const maxPanY = (canvas_height * scale - window.innerHeight) / 2 + 100;

        updatePanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, newPanX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, newPanY)),
        });
      }
    },
    [scale, panOffset, updateScale, updatePanOffset, canvasRef]
  );

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      setLastTouchDistance(distance);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        if (startPan.x !== 0 || startPan.y !== 0) {
          const deltaX = centerX - startPan.x;
          const deltaY = centerY - startPan.y;

          const maxPanX = (canvas_width * scale - window.innerWidth) / 2 + 100;
          const maxPanY = (canvas_height * scale - window.innerHeight) / 2 + 100;

          const newPanX = Math.max(-maxPanX, Math.min(maxPanX, panOffset.x + deltaX));
          const newPanY = Math.max(-maxPanY, Math.min(maxPanY, panOffset.y + deltaY));

          updatePanOffset({
            x: newPanX,
            y: newPanY,
          });
        }

        setStartPan({ x: centerX, y: centerY });

        const distance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        if (lastTouchDistance !== null) {
          const delta = (distance - lastTouchDistance) * 0.01;
          const minScale = 0.5;
          const maxScale = 2.0;
          const newScale = Math.min(Math.max(scale + delta, minScale), maxScale);
          updateScale(newScale);
        }
        setLastTouchDistance(distance);
      }
    },
    [startPan, panOffset, scale, lastTouchDistance, updatePanOffset, updateScale]
  );

  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(null);
    setStartPan({ x: 0, y: 0 });
  }, []);

  const drawStrokesOnCanvas = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas_width, canvas_height);
      
      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = 1 / scale;
      ctx.strokeRect(0, 0, canvas_width, canvas_height);

      strokes.forEach((stroke) => {
        if (stroke.type === "draw") {
          const path = new Path2D(stroke.path);
          ctx.fillStyle = stroke.color;
          ctx.fill(path);
        } else if (stroke.type === "text") {
          ctx.font = `${stroke.fontSize}px ${stroke.fontFamily}`;
          ctx.fillStyle = stroke.color;
          ctx.textBaseline = "top";
          ctx.fillText(stroke.text!, stroke.position!.x, stroke.position!.y);
        }
      });

      if (points.length > 0 && mode === ModeEnum.DRAW) {
        const path = new Path2D(
          getSvgPathFromStroke(
            getStroke(
              points.map((p) => [p.x, p.y, p.pressure]),
              { size: strokeWidth }
            )
          )
        );
        ctx.fillStyle = strokeColor;
        ctx.fill(path);
      }

      ctx.restore();
    },
    [strokes, points, panOffset, scale, mode, strokeColor, strokeWidth]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas size to match window size
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Scale context to account for device pixel ratio
        ctx.scale(dpr, dpr);
        // Set canvas CSS size
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        drawStrokesOnCanvas(ctx);
      }
    }
  }, [strokes, points, panOffset, scale, drawStrokesOnCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      canvas.addEventListener("touchstart", handleTouchStart);
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
      canvas.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener("wheel", handleWheel);
        canvas.removeEventListener("touchstart", handleTouchStart);
        canvas.removeEventListener("touchmove", handleTouchMove);
        canvas.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Căn giữa canvas khi khởi tạo
  useEffect(() => {
    if (canvasRef.current) {
      const initialPanX = (window.innerWidth - canvas_width) / 2;
      const initialPanY = (window.innerHeight - canvas_height) / 2;
      updatePanOffset({ x: initialPanX, y: initialPanY });
    }
  }, []);

  return {
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};