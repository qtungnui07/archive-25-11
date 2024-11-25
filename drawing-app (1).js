import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs/bundled/rough.esm";
import getStroke from "perfect-freehand";

const generator = rough.generator();

// Add pencil size options
const PENCIL_SIZES = {
  small: 2,
  medium: 4,
  large: 8
};

const createElement = (id, x1, y1, x2, y2, type, options = {}) => {
  switch (type) {
    case "line":
    case "rectangle":
      const roughElement =
        type === "line"
          ? generator.line(x1, y1, x2, y2)
          : generator.rectangle(x1, y1, x2 - x1, y2 - y1);
      return { id, x1, y1, x2, y2, type, roughElement };
    case "pencil":
      return { 
        id, 
        type, 
        points: [{ x: x1, y: y1 }],
        size: options.size || PENCIL_SIZES.medium // Default to medium size
      };
    case "selection":
      return { id, type, x1, y1, x2, y2 };
    case "text":
      return { id, type, x1, y1, x2, y2, text: "" };
    default:
      throw new Error(`Type not recognised: ${type}`);
  }
};

// ... (keep other utility functions the same until drawElement)

const drawElement = (roughCanvas, context, element) => {
  switch (element.type) {
    case "line":
    case "rectangle":
      roughCanvas.draw(element.roughElement);
      break;
    case "pencil":
      const strokeWidth = element.size || PENCIL_SIZES.medium;
      const stroke = getSvgPathFromStroke(getStroke(element.points, {
        size: strokeWidth,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      }));
      context.fillStyle = "black";
      context.fill(new Path2D(stroke));
      break;
    case "selection":
      context.setLineDash([5, 5]);
      context.strokeStyle = "black";
      context.strokeRect(element.x1, element.y1, element.x2 - element.x1, element.y2 - element.y1);
      context.setLineDash([]);
      break;
    case "text":
      context.textBaseline = "top";
      context.font = "24px sans-serif";
      context.fillText(element.text, element.x1, element.y1);
      break;
    default:
      throw new Error(`Type not recognised: ${element.type}`);
  }
};

// ... (keep other utility functions the same)

const App = () => {
  const [elements, setElements, undo, redo] = useHistory([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("rectangle");
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPanMousePosition, setStartPanMousePosition] = useState({ x: 0, y: 0 });
  const [pencilSize, setPencilSize] = useState(PENCIL_SIZES.default);
  const textAreaRef = useRef();
  const pressedKeys = usePressedKeys();

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    const roughCanvas = rough.canvas(canvas);

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.translate(panOffset.x, panOffset.y);

    elements.forEach(element => {
      if (action === "writing" && selectedElement?.id === element.id) return;
      drawElement(roughCanvas, context, element);
    });

    // Draw selection box if in selection mode
    if (selectedElement?.type === "selection") {
      drawElement(roughCanvas, context, selectedElement);
    }

    // Highlight selected elements
    selectedElements.forEach(element => {
      context.setLineDash([5, 5]);
      context.strokeStyle = "blue";
      if (element.type === "pencil") {
        const bounds = getPencilBounds(element.points);
        context.strokeRect(bounds.minX - 5, bounds.minY - 5, bounds.maxX - bounds.minX + 10, bounds.maxY - bounds.minY + 10);
      } else {
        context.strokeRect(element.x1 - 5, element.y1 - 5, (element.x2 - element.x1) + 10, (element.y2 - element.y1) + 10);
      }
      context.setLineDash([]);
    });

    context.restore();
  }, [elements, action, selectedElement, selectedElements, panOffset]);

  // Function to get pencil stroke bounds
  const getPencilBounds = (points) => {
    const xCoords = points.map(p => p.x);
    const yCoords = points.map(p => p.y);
    return {
      minX: Math.min(...xCoords),
      minY: Math.min(...yCoords),
      maxX: Math.max(...xCoords),
      maxY: Math.max(...yCoords)
    };
  };

  // Function to check if a point is inside selection
  const isWithinSelection = (x, y, selection) => {
    const minX = Math.min(selection.x1, selection.x2);
    const maxX = Math.max(selection.x1, selection.x2);
    const minY = Math.min(selection.y1, selection.y2);
    const maxY = Math.max(selection.y1, selection.y2);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };

  const handleMouseDown = event => {
    if (action === "writing") return;

    const { clientX, clientY } = getMouseCoordinates(event);

    if (event.button === 1 || pressedKeys.has(" ")) {
      setAction("panning");
      setStartPanMousePosition({ x: clientX, y: clientY });
      return;
    }

    if (tool === "selection") {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        if (element.type === "pencil") {
          const xOffsets = element.points.map(point => clientX - point.x);
          const yOffsets = element.points.map(point => clientY - point.y);
          setSelectedElement({ ...element, xOffsets, yOffsets });
        } else {
          const offsetX = clientX - element.x1;
          const offsetY = clientY - element.y1;
          setSelectedElement({ ...element, offsetX, offsetY });
        }
        if (element.position === "inside") {
          setAction("moving");
        } else {
          setAction("resizing");
        }
      } else {
        // Start selection box
        const element = createElement(elements.length, clientX, clientY, clientX, clientY, "selection");
        setSelectedElement(element);
        setAction("selecting");
      }
    } else {
      const id = elements.length;
      const element = createElement(id, clientX, clientY, clientX, clientY, tool, { size: pencilSize });
      setElements(prevState => [...prevState, element]);
      setSelectedElement(element);
      setAction(tool === "text" ? "writing" : "drawing");
    }
  };

  const handleMouseMove = event => {
    const { clientX, clientY } = getMouseCoordinates(event);

    if (action === "panning") {
      const deltaX = clientX - startPanMousePosition.x;
      const deltaY = clientY - startPanMousePosition.y;
      setPanOffset({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      });
      return;
    }

    if (action === "selecting") {
      const index = elements.length;
      const { x1, y1 } = selectedElement;
      const element = createElement(index, x1, y1, clientX, clientY, "selection");
      setSelectedElement(element);
    } else if (action === "drawing") {
      const index = elements.length - 1;
      const { x1, y1 } = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool, { size: pencilSize });
    } else if (action === "moving") {
      // ... (existing moving logic)
    } else if (action === "resizing") {
      // ... (existing resizing logic)
    }
  };

  const handleMouseUp = event => {
    const { clientX, clientY } = getMouseCoordinates(event);

    if (action === "selecting") {
      // Find elements within selection
      const selectedArea = selectedElement;
      const selected = elements.filter(el => {
        if (el.type === "pencil") {
          return el.points.some(point => 
            isWithinSelection(point.x, point.y, selectedArea)
          );
        } else {
          return isWithinSelection(el.x1, el.y1, selectedArea) &&
                 isWithinSelection(el.x2, el.y2, selectedArea);
        }
      });
      setSelectedElements(selected);
      setSelectedElement(null);
    }

    if (action === "drawing") {
      const index = selectedElement.id;
      const { id, type } = elements[index];
      if (adjustmentRequired(type)) {
        const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
        updateElement(id, x1, y1, x2, y2, type, { size: pencilSize });
      }
    }

    if (action === "writing") return;

    setAction("none");
    setSelectedElement(null);
  };
  const PencilSizePreview = () => {
    return (
      <div style={{ 
        width: pencilSize, 
        height: pencilSize, 
        borderRadius: '50%', 
        backgroundColor: 'black',
        marginLeft: '10px',
        display: 'inline-block'
      }} />
    );
  };

  return (
    <div>
      <div style={{ position: "fixed", zIndex: 2, padding: "10px", backgroundColor: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="radio"
            id="selection"
            checked={tool === "selection"}
            onChange={() => setTool("selection")}
          />
          <label htmlFor="selection">Selection</label>
          <input 
            type="radio" 
            id="line" 
            checked={tool === "line"} 
            onChange={() => setTool("line")} 
          />
          <label htmlFor="line">Line</label>
          <input
            type="radio"
            id="rectangle"
            checked={tool === "rectangle"}
            onChange={() => setTool("rectangle")}
          />
          <label htmlFor="rectangle">Rectangle</label>
          <input
            type="radio"
            id="pencil"
            checked={tool === "pencil"}
            onChange={() => setTool("pencil")}
          />
          <label htmlFor="pencil">Pencil</label>
          <input 
            type="radio" 
            id="text" 
            checked={tool === "text"} 
            onChange={() => setTool("text")} 
          />
          <label htmlFor="text">Text</label>
        </div>
        
        {/* Pencil size slider control */}
        {tool === "pencil" && (
          <div style={{ 
            display: "flex", 
            alignItems: "center",
            gap: "10px",
            padding: "5px 0"
          }}>
            <label htmlFor="pencil-size">Size:</label>
            <input
              type="range"
              id="pencil-size"
              min={PENCIL_SIZES.min}
              max={PENCIL_SIZES.max}
              value={pencilSize}
              onChange={(e) => setPencilSize(Number(e.target.value))}
              style={{ 
                width: "150px",
                cursor: "pointer"
              }}
            />
            <PencilSizePreview />
            <span style={{ minWidth: "30px" }}>{pencilSize}px</span>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", zIndex: 2, bottom: 0, padding: 10 }}>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>

      {action === "writing" ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          style={{
            position: "fixed",
            top: selectedElement.y1 - 2 + panOffset.y,
            left: selectedElement.x1 + panOffset.x,
            font: "24px sans-serif",
            margin: 0,
            padding: 0,
            border: 0,
            outline: 0,
            resize: "auto",
            overflow: "hidden",
            whiteSpace: "pre",
            background: "transparent",
            zIndex: 2,
          }}
        />
      ) : null}

      <canvas
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ position: "absolute", zIndex: 1 }}
      >
        Canvas
      </canvas>
    </div>
  );
};

export default App;