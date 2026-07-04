import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PlayCircle, RefreshCw, Copy, Check, Terminal, Code, Database, Eye, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodeSandboxPanelProps {
  sessionId: string;
  skillCanonical: string;
  sessionTitle: string;
  onClose: () => void;
  sectionTitle?: string;
}

// ─── Default Templates & Data ──────────────────────────────────────────

const SECTION_TEMPLATES: Record<string, { code: string; type: "cv" | "web" | "sql" | "js" | "text"; instructions: string }> = {
  "resizing, drawing, and text overlays": {
    type: "cv",
    instructions: "Change coordinates and colors to draw circles and rectangles on the simulated canvas. Resize image to 400x300.",
    code: `import cv2

# Read canvas viewport
img = cv2.imread("input.jpg")
resized = cv2.resize(img, (400, 300))

# [Task] Draw a green border rectangle (BGR: 0, 255, 0, thickness: 3)
cv2.rectangle(resized, (30, 30), (370, 270), (0, 255, 0), 3)

# [Task] Draw a solid blue circle (BGR: 255, 0, 0, thickness: -1)
cv2.circle(resized, (200, 150), 60, (255, 0, 0), -1)

# [Task] Add text caption (BGR: 255, 255, 255, thickness: 2)
cv2.putText(resized, "OpenCV Canvas Lab", (50, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
`
  },
  "reading images and video": {
    type: "cv",
    instructions: "Simulate reading a video frame sequence or base image array, and print BGR properties.",
    code: `import cv2

# Load camera port frame
img = cv2.imread("input.jpg")

if img is not None:
    height, width, channels = img.shape
    print("[RUN] Image loaded successfully.")
    print("Dimensions:", width, "x", height)
    print("Channels:", channels)
    print("Center Pixel BGR:", img[height // 2, width // 2])
else:
    print("Error: Viewport offline.")
`
  },
  "introduction and opencv setup": {
    type: "cv",
    instructions: "Initialize environment libraries and check version metrics.",
    code: `import cv2
import numpy as np

print("[SYSTEM] Starting virtual python environment...")
print("OpenCV Version:", cv2.__version__)
print("NumPy Version:", np.__version__)
print("Virtual Camera Status: ONLINE")
`
  },
  "image transforms, edges, and contours": {
    type: "cv",
    instructions: "Convert viewport frame to grayscale and execute Canny edge boundaries.",
    code: `import cv2

img = cv2.imread("input.jpg")

# 1. Transform color space
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
print("[COLOR] Converted to Grayscale successfully.")

# 2. Extract edge contours
edges = cv2.Canny(gray, 100, 200)
print("[CANNY] Extracted contours, found 14 active edges.")
`
  },
  "face detection and recognition basics": {
    type: "cv",
    instructions: "Query model catalog cascade files and query bounding box coordinates.",
    code: `import cv2

# Load XML Cascade Classifier
classifier = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")
print("[MODEL] Model 'haarcascade_frontalface_default.xml' loaded successfully.")

# Query detections
print("[DETECTION] Running model inference...")
print("[RESULT] 1 face detected at bounding box coordinate: (120, 80, 240, 260)")
`
  }
};

const SKILL_TEMPLATES: Record<string, { code: string; type: "cv" | "web" | "sql" | "js" | "text"; instructions: string }> = {
  "computer_vision": {
    type: "cv",
    instructions: "Resize image to 400x300. Draw a green rectangle (thickness 2), a red circle (filled, BGR color), and white text 'SkillBridge CV' on top.",
    code: `import cv2

# 1. Read input image
img = cv2.imread("input.jpg")

# 2. Resize image (width, height)
resized = cv2.resize(img, (400, 300))

# 3. Draw a green rectangle (BGR: 0, 255, 0)
cv2.rectangle(resized, (50, 50), (200, 200), (0, 255, 0), 2)

# 4. Draw a solid red circle (BGR: 0, 0, 255, thickness -1)
cv2.circle(resized, (300, 150), 50, (0, 0, 255), -1)

# 5. Write white text (BGR: 255, 255, 255)
cv2.putText(resized, "SkillBridge CV", (50, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
`
  },
  "sql": {
    type: "sql",
    instructions: "Query all active students with stars greater than or equal to 3. Display name, skill, and stars.",
    code: `-- Task: Filter active students with stars >= 3
SELECT name, skill, stars, status 
FROM students 
WHERE status = 'active' AND stars >= 3;
`
  },
  "html": {
    type: "web",
    instructions: "Design a custom premium badge with a glowing pulse effect.",
    code: `<!-- Premium Student Badge template -->
<div class="badge">
  <span class="pulse-dot"></span>
  Interactive Learner
</div>

<style>
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #0f172a;
    margin: 0;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 18px;
    background: rgba(14, 165, 233, 0.1);
    border: 1px solid rgba(14, 165, 233, 0.3);
    color: #0ea5e9;
    border-radius: 9999px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 0 15px rgba(14, 165, 233, 0.15);
  }
  .pulse-dot {
    width: 8px;
    height: 8px;
    background: #0ea5e9;
    border-radius: 50%;
    box-shadow: 0 0 8px #0ea5e9;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.2); }
  }
</style>
`
  },
  "javascript": {
    type: "js",
    instructions: "Write a function calculateBonus(score, streak) returning 200 if streak >= 5 and score >= 80, else 50.",
    code: `function calculateBonus(score, streak) {
  // Write your code here
  if (streak >= 5 && score >= 80) {
    return 200;
  }
  return 50;
}

// Test cases
console.log("Test 1 (High streak/score):", calculateBonus(85, 6)); // Expected: 200
console.log("Test 2 (Low streak):", calculateBonus(90, 3)); // Expected: 50
console.log("Test 3 (Low score):", calculateBonus(70, 7)); // Expected: 50
`
  }
};

const DEFAULT_TEMPLATE = {
  type: "text" as const,
  instructions: "Draft your learning reflections or project outline here.",
  code: `# Learning Scratchpad

- Key take-aways from this session:
  1. 
  2. 

- Practical ideas to apply:
  - 
`
};

const MOCK_STUDENTS = [
  { name: "Nguyen Van A", skill: "React", stars: 4, status: "active" },
  { name: "Tran Thi B", skill: "Node.js", stars: 2, status: "active" },
  { name: "Le Van C", skill: "OpenCV", stars: 5, status: "active" },
  { name: "Pham Minh D", skill: "Git", stars: 1, status: "inactive" },
  { name: "Hoang Anh E", skill: "SQL", stars: 3, status: "active" },
];

export function CodeSandboxPanel({
  sessionId,
  skillCanonical,
  sessionTitle,
  onClose,
  sectionTitle,
}: CodeSandboxPanelProps) {
  const { t } = useTranslation("common");
  
  // Identify template based on sectionTitle first, then fallback to skillCanonical
  const sectionKey = Object.keys(SECTION_TEMPLATES).find(k => 
    sectionTitle && sectionTitle.toLowerCase().includes(k)
  ) || "";
  
  const template = sectionKey 
    ? SECTION_TEMPLATES[sectionKey] 
    : (Object.keys(SKILL_TEMPLATES).find(k => skillCanonical.toLowerCase().includes(k)) 
        ? SKILL_TEMPLATES[Object.keys(SKILL_TEMPLATES).find(k => skillCanonical.toLowerCase().includes(k))!] 
        : DEFAULT_TEMPLATE);

  const [code, setCode] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  // SQL data grid result state
  const [sqlResults, setSqlResults] = useState<any[] | null>(null);

  // Web rendering iframe srcDoc state
  const [webSrcDoc, setWebSrcDoc] = useState("");

  // OpenCV canvas drawing queue
  const [cvOps, setCvOps] = useState<any[]>([]);
  const [cvSize, setCvSize] = useState({ w: 400, h: 300 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Load saved scratch code per section or load default template
    const sectionSlug = sectionTitle ? sectionTitle.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() : "general";
    const saved = localStorage.getItem(`skillbridge_sandbox_code_${sessionId}_${sectionSlug}`);
    if (saved) {
      setCode(saved);
    } else {
      setCode(template.code);
    }
    setLogs([`[READY] Code Sandbox loaded for: ${sectionTitle || "General Sandbox"}. Write code and click 'Run Code' to execute.`]);
    setSqlResults(null);
    setWebSrcDoc("");
    setCvOps([]);
  }, [sessionId, sectionTitle, template]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode(template.code);
    const sectionSlug = sectionTitle ? sectionTitle.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() : "general";
    localStorage.removeItem(`skillbridge_sandbox_code_${sessionId}_${sectionSlug}`);
    setLogs(["[RESET] Sandbox code reset to original template."]);
    setSqlResults(null);
    setWebSrcDoc("");
    setCvOps([]);
  };

  const runCode = () => {
    setIsRunning(true);
    const sectionSlug = sectionTitle ? sectionTitle.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() : "general";
    localStorage.setItem(`skillbridge_sandbox_code_${sessionId}_${sectionSlug}`, code);
    
    // Simulate code run latency
    setTimeout(() => {
      const outputLogs: string[] = [];

      if (template.type === "cv") {
        // Parse python cv2 commands
        outputLogs.push("[INFO] Parsing virtual Python OpenCV code...");
        outputLogs.push("[INFO] cv2.imread('input.jpg') -> loaded base image (640x480)");

        const drawingOps: any[] = [];
        
        // 1. Check resize
        const resizeMatch = code.match(/cv2\.resize\(\w+,\s*\((\d+),\s*(\d+)\)\)/);
        let w = 400;
        let h = 300;
        if (resizeMatch) {
          w = parseInt(resizeMatch[1]);
          h = parseInt(resizeMatch[2]);
          outputLogs.push(`[INFO] cv2.resize called: scaled viewport to (${w}x${h})`);
        }
        setCvSize({ w, h });

        // 2. Check rectangle
        const rectRegex = /cv2\.rectangle\(\w+,\s*\((\d+),\s*(\d+)\),\s*\((\d+),\s*(\d+)\),\s*\(([^)]+)\)(?:,\s*(-?\d+))?\)/g;
        let rMatch;
        while ((rMatch = rectRegex.exec(code)) !== null) {
          const x1 = parseInt(rMatch[1]);
          const y1 = parseInt(rMatch[2]);
          const x2 = parseInt(rMatch[3]);
          const y2 = parseInt(rMatch[4]);
          const bgr = rMatch[5].split(",").map(c => parseInt(c.trim()));
          const thick = rMatch[6] ? parseInt(rMatch[6]) : 1;
          drawingOps.push({ type: "rectangle", x1, y1, x2, y2, bgr, thick });
          outputLogs.push(`[INFO] cv2.rectangle: drew from (${x1}, ${y1}) to (${x2}, ${y2}) with thickness ${thick}`);
        }

        // 3. Check circle
        const circleRegex = /cv2\.circle\(\w+,\s*\((\d+),\s*(\d+)\),\s*(\d+),\s*\(([^)]+)\)(?:,\s*(-?\d+))?\)/g;
        let cMatch;
        while ((cMatch = circleRegex.exec(code)) !== null) {
          const cx = parseInt(cMatch[1]);
          const cy = parseInt(cMatch[2]);
          const radius = parseInt(cMatch[3]);
          const bgr = cMatch[4].split(",").map(c => parseInt(c.trim()));
          const thick = cMatch[5] ? parseInt(cMatch[5]) : 1;
          drawingOps.push({ type: "circle", cx, cy, radius, bgr, thick });
          outputLogs.push(`[INFO] cv2.circle: drew center (${cx}, ${cy}) radius ${radius}`);
        }

        // 4. Check text
        const textRegex = /cv2\.putText\(\w+,\s*["']([^"']+)["'],\s*\((\d+),\s*(\d+)\),\s*[^,\s]+,\s*([\d.]+),\s*\(([^)]+)\)(?:,\s*(\d+))?\)/g;
        let tMatch;
        while ((tMatch = textRegex.exec(code)) !== null) {
          const text = tMatch[1];
          const x = parseInt(tMatch[2]);
          const y = parseInt(tMatch[3]);
          const scale = parseFloat(tMatch[4]);
          const bgr = tMatch[5].split(",").map(c => parseInt(c.trim()));
          const thick = tMatch[6] ? parseInt(tMatch[6]) : 1;
          drawingOps.push({ type: "text", text, x, y, scale, bgr, thick });
          outputLogs.push(`[INFO] cv2.putText: overlayed "${text}" at (${x}, ${y})`);
        }

        setCvOps(drawingOps);
        outputLogs.push("[SUCCESS] Output rendered successfully to simulated viewport.");
      } 
      else if (template.type === "sql") {
        outputLogs.push("[INFO] Connecting to postgres://localhost:5432/skillbridge...");
        outputLogs.push("[INFO] Analyzing SQL query AST...");
        
        // Parse SQL conditions
        const isSelect = code.toLowerCase().includes("select");
        const matchesStars = code.toLowerCase().includes("stars >= 3");
        const matchesActive = code.toLowerCase().includes("status = 'active'") || code.toLowerCase().includes("status='active'");

        if (isSelect) {
          let rows = MOCK_STUDENTS;
          if (matchesActive) {
            rows = rows.filter(s => s.status === "active");
          }
          if (matchesStars) {
            rows = rows.filter(s => s.stars >= 3);
          }
          setSqlResults(rows);
          outputLogs.push(`[INFO] Query returned ${rows.length} rows.`);
          outputLogs.push("[SUCCESS] Executed SQL query successfully.");
        } else {
          setSqlResults([]);
          outputLogs.push("[ERROR] Only SELECT statements are supported in this sandbox.");
        }
      } 
      else if (template.type === "web") {
        outputLogs.push("[INFO] Compiling HTML/CSS document sandbox...");
        setWebSrcDoc(code);
        outputLogs.push("[SUCCESS] Hot-reloaded live preview frame.");
      } 
      else if (template.type === "js") {
        outputLogs.push("[INFO] Initializing Javascript context...");
        
        // Setup console.log capture
        const logCapture: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logCapture.push("[CONSOLE] " + args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" "));
        };

        try {
          // Run JS
          const runFn = new Function(code);
          runFn();
          outputLogs.push(...logCapture);
          outputLogs.push("[SUCCESS] Script executed successfully.");
        } catch (err: any) {
          outputLogs.push(...logCapture);
          outputLogs.push(`[RUNTIME ERROR] ${err.message}`);
        } finally {
          console.log = originalLog;
        }
      } 
      else {
        // Markdown reflection text check
        outputLogs.push("[INFO] Evaluating markdown formatting...");
        const wordCount = code.trim().split(/\s+/).filter(Boolean).length;
        outputLogs.push(`[INFO] Text contains ${wordCount} words.`);
        outputLogs.push("[SUCCESS] Reflections saved successfully to browser cache.");
      }

      setLogs(outputLogs);
      setIsRunning(false);
    }, 600);
  };

  // Render CV Canvas overlays
  useEffect(() => {
    if (template.type !== "cv" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw viewport grid background
    ctx.fillStyle = "#0f172a"; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw camera grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 40; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Grid center calibration crosshair
    ctx.strokeStyle = "rgba(59,130,246,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2);
    ctx.lineTo(canvas.width / 2 + 10, canvas.height / 2);
    ctx.moveTo(canvas.width / 2, canvas.height / 2 - 10);
    ctx.lineTo(canvas.width / 2, canvas.height / 2 + 10);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "9px monospace";
    ctx.fillText("CAM-01 VIEWPORT", 15, 20);

    // 2. Draw parsed CV operations
    cvOps.forEach((op) => {
      // Map BGR arrays to standard RGB style strings
      const bgr = op.bgr || [255, 255, 255];
      const rgbStr = `rgb(${bgr[2]}, ${bgr[1]}, ${bgr[0]})`;

      ctx.strokeStyle = rgbStr;
      ctx.fillStyle = rgbStr;
      ctx.lineWidth = op.thick > 0 ? op.thick : 2;

      if (op.type === "rectangle") {
        if (op.thick < 0) {
          ctx.fillRect(op.x1, op.y1, op.x2 - op.x1, op.y2 - op.y1);
        } else {
          ctx.strokeRect(op.x1, op.y1, op.x2 - op.x1, op.y2 - op.y1);
        }
      } 
      else if (op.type === "circle") {
        ctx.beginPath();
        ctx.arc(op.cx, op.cy, op.radius, 0, 2 * Math.PI);
        if (op.thick < 0) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
      } 
      else if (op.type === "text") {
        ctx.font = `bold ${Math.round(op.scale * 18)}px sans-serif`;
        ctx.fillText(op.text, op.x, op.y);
      }
    });
  }, [cvOps, cvSize, template.type]);

  const lineCount = code.split("\n").length;

  return (
    <div className="absolute top-0 right-0 z-30 flex flex-col h-full bg-slate-950/90 backdrop-blur-md border-l border-slate-800/80 rounded-l-2xl w-[420px] lg:w-[480px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in slide-in-from-right-4 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/45 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Terminal className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Code Sandbox</p>
            <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[240px]">{sessionTitle}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-450 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Task Instructions Banner */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
             <Eye className="w-3.5 h-3.5" /> Exercise Target
          </p>
          <p className="text-xs text-slate-355 mt-1 leading-relaxed">{template.instructions}</p>
        </div>

        {/* Code Editor Container */}
        <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner relative">
          {/* Editor Header Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-xs text-slate-400">
            <span className="font-mono font-bold flex items-center gap-1.5"><Code className="w-3.5 h-3.5" /> script.py</span>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="p-1 hover:text-white transition-colors" title="Copy code">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button onClick={handleReset} className="p-1 hover:text-white transition-colors" title="Reset template">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Line Numbers + Textarea Editor */}
          <div className="flex flex-1 relative font-mono text-sm leading-6 min-h-[160px] max-h-[280px]">
            {/* Line numbers column */}
            <div className="w-10 select-none text-right pr-2.5 py-3 border-r border-slate-850 text-slate-600 bg-slate-950/80 text-xs">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Real textarea */}
            <textarea
              className="flex-1 bg-transparent px-3 py-3 outline-none resize-none text-emerald-400 font-mono text-xs leading-6 placeholder:text-slate-700 min-h-[160px] custom-scrollbar"
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex justify-between items-center">
          <Button
            size="sm"
            onClick={runCode}
            disabled={isRunning || !code.trim()}
            className="rounded-full bg-primary hover:bg-primary/90 text-white font-bold h-9 px-5 flex items-center gap-1.5 shadow-md shadow-primary/10 active:scale-[0.98] transition-all"
          >
            <PlayCircle className={cn("w-4 h-4", isRunning && "animate-spin")} />
            {isRunning ? "Running..." : "Run Code"}
          </Button>
        </div>

        {/* Active Simulator Window based on template type */}
        
        {/* A. Computer Vision Viewport */}
        {template.type === "cv" && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Simulated Viewport output.jpg</p>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                width={cvSize.w}
                height={cvSize.h}
                className="rounded-lg shadow-md max-w-full"
              />
            </div>
          </div>
        )}

        {/* B. SQL Data Matrix Grid */}
        {template.type === "sql" && sqlResults !== null && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1"><Database className="w-3.5 h-3.5 text-primary" /> SQL Output Matrix</p>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-[160px] overflow-y-auto custom-scrollbar">
              {sqlResults.length > 0 ? (
                <table className="w-full text-[11px] text-left text-slate-300">
                  <thead className="text-[10px] font-bold text-slate-500 bg-slate-900 uppercase">
                    <tr>
                      <th className="px-3 py-2 border-b border-slate-850">Name</th>
                      <th className="px-3 py-2 border-b border-slate-850">Skill</th>
                      <th className="px-3 py-2 border-b border-slate-850">Stars</th>
                      <th className="px-3 py-2 border-b border-slate-850">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sqlResults.map((r, i) => (
                      <tr key={i} className="border-b border-slate-850 hover:bg-slate-900/40">
                        <td className="px-3 py-1.5 font-bold text-white">{r.name}</td>
                        <td className="px-3 py-1.5">{r.skill}</td>
                        <td className="px-3 py-1.5 text-amber-400 font-black">★ {r.stars}</td>
                        <td className="px-3 py-1.5">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                            r.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
                          )}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 italic">No matching rows returned.</div>
              )}
            </div>
          </div>
        )}

        {/* C. Live HTML Web Preview Frame */}
        {template.type === "web" && webSrcDoc && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Live Web Output frame</p>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-white shadow-md h-[150px]">
              <iframe
                title="Live Web Sandbox Preview"
                srcDoc={webSrcDoc}
                sandbox="allow-scripts"
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        )}

        {/* Virtual Output Logs Terminal */}
        <div className="flex flex-col rounded-xl border border-slate-800 bg-black overflow-hidden font-mono shadow-md">
          {/* Terminal Title */}
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border-b border-slate-800 text-[10px] font-black text-slate-450 uppercase tracking-widest">
            <Terminal className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Virtual Console Terminal
          </div>
          {/* Logs Body */}
          <div className="p-4 space-y-1.5 text-[11px] leading-5 min-h-[100px] max-h-[180px] overflow-y-auto custom-scrollbar">
            {logs.map((log, i) => (
              <div
                key={i}
                className={cn(
                  log.startsWith("[SUCCESS]") && "text-emerald-400 font-bold",
                  log.startsWith("[ERROR]") && "text-red-400 font-bold",
                  log.startsWith("[RUNTIME ERROR]") && "text-red-400 font-bold",
                  log.startsWith("[READY]") && "text-blue-400 font-bold",
                  log.startsWith("[RESET]") && "text-amber-400 font-semibold",
                  log.startsWith("[CONSOLE]") && "text-sky-300 font-bold",
                  !log.startsWith("[") && "text-slate-450"
                )}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
