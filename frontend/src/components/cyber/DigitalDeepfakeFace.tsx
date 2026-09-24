import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../state/theme";
import { ShieldAlert, Scan } from "lucide-react";

// Anatomical 3D landmarks for human face [x, y, z] normalized (-1 to 1)
interface Landmark3D {
  id: string;
  x: number;
  y: number;
  z: number;
  isFeaturePoint?: boolean;
  region: "forehead" | "jaw" | "brow" | "eye" | "nose" | "mouth" | "cheek";
}

const LANDMARKS_3D: Landmark3D[] = [
  // Forehead & hairline curve
  { id: "fh_c", x: 0, y: -0.92, z: 0.15, region: "forehead" },
  { id: "fh_l1", x: -0.32, y: -0.88, z: 0.08, region: "forehead" },
  { id: "fh_r1", x: 0.32, y: -0.88, z: 0.08, region: "forehead" },
  { id: "fh_l2", x: -0.58, y: -0.72, z: -0.15, region: "forehead" },
  { id: "fh_r2", x: 0.58, y: -0.72, z: -0.15, region: "forehead" },

  // Temples & Jawline contour
  { id: "tmp_l", x: -0.72, y: -0.42, z: -0.32, region: "jaw" },
  { id: "tmp_r", x: 0.72, y: -0.42, z: -0.32, region: "jaw" },
  { id: "jaw_l1", x: -0.74, y: 0.02, z: -0.35, region: "jaw" },
  { id: "jaw_r1", x: 0.74, y: 0.02, z: -0.35, region: "jaw" },
  { id: "jaw_l2", x: -0.62, y: 0.44, z: -0.22, region: "jaw" },
  { id: "jaw_r2", x: 0.62, y: 0.44, z: -0.22, region: "jaw" },
  { id: "jaw_l3", x: -0.38, y: 0.78, z: 0.05, region: "jaw" },
  { id: "jaw_r3", x: 0.38, y: 0.78, z: 0.05, region: "jaw" },
  { id: "chin_b", x: 0, y: 0.95, z: 0.28, isFeaturePoint: true, region: "jaw" },

  // Eyebrows
  { id: "brw_l_out", x: -0.52, y: -0.42, z: 0.12, region: "brow" },
  { id: "brw_l_mid", x: -0.34, y: -0.48, z: 0.22, isFeaturePoint: true, region: "brow" },
  { id: "brw_l_in", x: -0.14, y: -0.44, z: 0.26, region: "brow" },
  { id: "brw_r_in", x: 0.14, y: -0.44, z: 0.26, region: "brow" },
  { id: "brw_r_mid", x: 0.34, y: -0.48, z: 0.22, isFeaturePoint: true, region: "brow" },
  { id: "brw_r_out", x: 0.52, y: -0.42, z: 0.12, region: "brow" },

  // Eyes (Left eye)
  { id: "eye_l_out", x: -0.48, y: -0.28, z: 0.14, isFeaturePoint: true, region: "eye" },
  { id: "eye_l_top", x: -0.33, y: -0.33, z: 0.22, region: "eye" },
  { id: "eye_l_in", x: -0.18, y: -0.28, z: 0.24, isFeaturePoint: true, region: "eye" },
  { id: "eye_l_btm", x: -0.33, y: -0.22, z: 0.21, region: "eye" },
  { id: "pupil_l", x: -0.33, y: -0.27, z: 0.25, isFeaturePoint: true, region: "eye" },

  // Eyes (Right eye)
  { id: "eye_r_in", x: 0.18, y: -0.28, z: 0.24, isFeaturePoint: true, region: "eye" },
  { id: "eye_r_top", x: 0.33, y: -0.33, z: 0.22, region: "eye" },
  { id: "eye_r_out", x: 0.48, y: -0.28, z: 0.14, isFeaturePoint: true, region: "eye" },
  { id: "eye_r_btm", x: 0.33, y: -0.22, z: 0.21, region: "eye" },
  { id: "pupil_r", x: 0.33, y: -0.27, z: 0.25, isFeaturePoint: true, region: "eye" },

  // Cheeks / Malar bone
  { id: "chk_l_up", x: -0.55, y: -0.06, z: 0.18, region: "cheek" },
  { id: "chk_r_up", x: 0.55, y: -0.06, z: 0.18, region: "cheek" },
  { id: "chk_l_mid", x: -0.42, y: 0.18, z: 0.15, region: "cheek" },
  { id: "chk_r_mid", x: 0.42, y: 0.18, z: 0.15, region: "cheek" },

  // Nose
  { id: "ns_top", x: 0, y: -0.38, z: 0.32, region: "nose" },
  { id: "ns_mid", x: 0, y: -0.12, z: 0.46, isFeaturePoint: true, region: "nose" },
  { id: "ns_tip", x: 0, y: 0.12, z: 0.58, isFeaturePoint: true, region: "nose" },
  { id: "ns_l_wing", x: -0.16, y: 0.14, z: 0.36, region: "nose" },
  { id: "ns_r_wing", x: 0.16, y: 0.14, z: 0.36, region: "nose" },
  { id: "ns_btm", x: 0, y: 0.24, z: 0.42, region: "nose" },

  // Mouth & Lips
  { id: "lp_l_c", x: -0.28, y: 0.44, z: 0.26, isFeaturePoint: true, region: "mouth" },
  { id: "lp_up_t", x: 0, y: 0.38, z: 0.45, isFeaturePoint: true, region: "mouth" },
  { id: "lp_r_c", x: 0.28, y: 0.44, z: 0.26, isFeaturePoint: true, region: "mouth" },
  { id: "lp_dn_b", x: 0, y: 0.56, z: 0.42, isFeaturePoint: true, region: "mouth" },
  { id: "lp_ctr", x: 0, y: 0.46, z: 0.40, region: "mouth" },
];

// Polygonal edges connecting landmarks
const EDGES: [number, number][] = [
  // Forehead outline
  [3, 1], [1, 0], [0, 2], [2, 4],
  [3, 5], [4, 6],
  // Temples & Jaw outline
  [5, 7], [7, 9], [9, 11], [11, 13],
  [6, 8], [8, 10], [10, 12], [12, 13],
  // Forehead down to brow & nose top
  [1, 15], [0, 31], [2, 18],
  // Brows
  [14, 15], [15, 16], [16, 31], [31, 17], [17, 18], [18, 19],
  // Brow to eyes
  [14, 20], [15, 21], [16, 22], [17, 25], [18, 26], [19, 27],
  // Left eye loop
  [20, 21], [21, 22], [22, 23], [23, 20],
  // Right eye loop
  [25, 26], [26, 27], [27, 28], [28, 25],
  // Nose ridge
  [31, 32], [32, 33], [33, 36],
  [33, 34], [33, 35], [34, 36], [35, 36],
  // Cheeks connections
  [20, 29], [29, 34], [29, 9],
  [27, 30], [30, 35], [30, 10],
  [29, 31], [30, 31],
  // Nose to mouth
  [36, 38], [34, 37], [35, 39],
  // Lips loop
  [37, 38], [38, 39], [39, 40], [40, 37],
  [37, 41], [39, 41], [38, 41], [40, 41],
  // Mouth to chin & jaw
  [37, 11], [39, 12], [40, 13],
  [29, 11], [30, 12],
];

type MotionPhase =
  | "calm"
  | "slight_move"
  | "pause_1"
  | "scan"
  | "slight_rotation"
  | "pause_2"
  | "distortion";

export function DigitalDeepfakeFace({
  className = "",
}: {
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [currentPhase, setCurrentPhase] = useState<MotionPhase>("calm");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersReducedMotion = mediaQuery.matches;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 340);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 380);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse parallax tracking
    let targetMouseYaw = 0;
    let targetMousePitch = 0;
    let mouseYaw = 0;
    let mousePitch = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetMouseYaw = nx * 0.12; // ~6.8 degrees
      targetMousePitch = -ny * 0.08; // ~4.5 degrees
    };

    const handleMouseLeave = () => {
      targetMouseYaw = 0;
      targetMousePitch = 0;
    };

    const container = containerRef.current;
    container?.addEventListener("mousemove", handleMouseMove, { passive: true });
    container?.addEventListener("mouseleave", handleMouseLeave);

    // State machine timeline configuration (Total cycle ~ 17 seconds)
    // 0 -> 4.5s: calm
    // 4.5s -> 7.0s: slight_move (yaw +5 deg)
    // 7.0s -> 8.2s: pause_1
    // 8.2s -> 11.2s: scan (laser sweeps)
    // 11.2s -> 13.5s: slight_rotation (yaw -5 deg)
    // 13.5s -> 14.5s: pause_2
    // 14.5s -> 16.5s: distortion (jitter & anomaly flag)
    const CYCLE_DURATION = 16500;
    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) % CYCLE_DURATION;

      // Mouse lerp
      mouseYaw += (targetMouseYaw - mouseYaw) * 0.08;
      mousePitch += (targetMousePitch - mousePitch) * 0.08;

      let yaw = 0;
      let pitch = 0;
      let scanYProgress = -1; // -1 means no scan, 0..1 means scanning
      let isDistorting = false;
      let phase: MotionPhase = "calm";

      if (prefersReducedMotion) {
        // Calm steady posture with no abrupt motion
        yaw = 0.02;
        pitch = -0.01;
      } else {
        if (elapsed < 4500) {
          // CALM: Gentle breathing drift
          phase = "calm";
          const t = elapsed / 4500;
          yaw = Math.sin(t * Math.PI * 2) * 0.015;
          pitch = Math.cos(t * Math.PI * 2) * 0.012;
        } else if (elapsed < 7000) {
          // SLIGHT MOVEMENT: Smooth turn to the right
          phase = "slight_move";
          const progress = (elapsed - 4500) / 2500;
          // Smooth ease-in-out
          const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
          yaw = ease * 0.09; // +5.1 degrees
          pitch = -ease * 0.04;
        } else if (elapsed < 8200) {
          // PAUSE 1: Holds angle
          phase = "pause_1";
          yaw = 0.09;
          pitch = -0.04;
        } else if (elapsed < 11200) {
          // SCAN: Laser sweep passes vertically
          phase = "scan";
          const progress = (elapsed - 8200) / 3000;
          scanYProgress = progress; // 0 to 1
          yaw = 0.09 + Math.sin(progress * Math.PI * 3) * 0.01;
          pitch = -0.04;
        } else if (elapsed < 13500) {
          // SLIGHT ROTATION: Turn to the left
          phase = "slight_rotation";
          const progress = (elapsed - 11200) / 2300;
          const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
          yaw = 0.09 - ease * 0.18; // swings from +0.09 to -0.09
          pitch = -0.04 + ease * 0.07;
        } else if (elapsed < 14500) {
          // PAUSE 2: Holds left angle
          phase = "pause_2";
          yaw = -0.09;
          pitch = 0.03;
        } else {
          // DISTORTION: Deepfake artifact glitch!
          phase = "distortion";
          const progress = (elapsed - 14500) / 2000;
          isDistorting = true;
          const returnEase = progress;
          yaw = -0.09 * (1 - returnEase);
          pitch = 0.03 * (1 - returnEase);
        }
      }

      setCurrentPhase(phase);

      // Add mouse parallax
      yaw += mouseYaw;
      pitch += mousePitch;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + 10;
      const baseScale = Math.min(width, height) * 0.44;
      const focalLength = 3.2;

      // Project 3D landmarks to 2D
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const projected = LANDMARKS_3D.map((lm, idx) => {
        let lx = lm.x;
        let ly = lm.y;
        let lz = lm.z;

        // Apply slight synthetic distortion jitter during artifact phase
        if (isDistorting && (lm.region === "mouth" || lm.region === "jaw" || lm.region === "eye")) {
          const jitter = (Math.sin(now * 0.04 + idx * 3.7) + Math.cos(now * 0.02 + idx)) * 0.025;
          lx += jitter;
          ly += jitter * 0.5;
        }

        // Rotate Y (yaw)
        const x1 = lx * cosY + lz * sinY;
        const z1 = -lx * sinY + lz * cosY;

        // Rotate X (pitch)
        const y2 = ly * cosP - z1 * sinP;
        const z2 = ly * sinP + z1 * cosP;

        // Perspective division
        const scale = focalLength / (focalLength + z2);
        const px = centerX + x1 * scale * baseScale;
        const py = centerY + y2 * scale * baseScale;

        // Check if currently intersected by laser scanline
        // Normalized scanline position mapped to screen Y
        let isScanned = false;
        if (scanYProgress >= 0) {
          const scanScreenY = centerY - baseScale * 1.1 + scanYProgress * baseScale * 2.2;
          isScanned = Math.abs(py - scanScreenY) < 18;
        }

        return { px, py, z: z2, isScanned, landmark: lm };
      });

      // Palette definition
      const normalLine = isDark ? "rgba(6, 182, 212, 0.35)" : "rgba(14, 116, 144, 0.32)";
      const highlightLine = isDark ? "rgba(56, 189, 248, 0.75)" : "rgba(14, 116, 144, 0.75)";
      const anomalyLine = isDark ? "rgba(239, 68, 68, 0.85)" : "rgba(220, 38, 38, 0.85)";
      const scanLineColor = isDark ? "#38bdf8" : "#0891b2";
      const nodeFill = isDark ? "#06b6d4" : "#0e7490";
      const warningFill = isDark ? "#f59e0b" : "#d97706";

      // 1. Draw subtle background coordinate circles (biometric radar)
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseScale * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? "rgba(6, 182, 212, 0.08)" : "rgba(15, 23, 42, 0.05)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw wireframe edges
      for (const [i1, i2] of EDGES) {
        const p1 = projected[i1];
        const p2 = projected[i2];
        if (!p1 || !p2) continue;

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);

        if (isDistorting && (p1.landmark.region === "mouth" || p2.landmark.region === "mouth")) {
          ctx.strokeStyle = anomalyLine;
          ctx.lineWidth = 1.6;
        } else if (p1.isScanned || p2.isScanned) {
          ctx.strokeStyle = highlightLine;
          ctx.lineWidth = 1.4;
        } else {
          ctx.strokeStyle = normalLine;
          ctx.lineWidth = 0.85;
        }
        ctx.stroke();
      }

      // 3. Draw active laser scanline when in scanning phase
      if (scanYProgress >= 0) {
        const scanScreenY = centerY - baseScale * 1.1 + scanYProgress * baseScale * 2.2;

        // Laser beam
        ctx.beginPath();
        ctx.moveTo(centerX - baseScale * 1.1, scanScreenY);
        ctx.lineTo(centerX + baseScale * 1.1, scanScreenY);
        ctx.strokeStyle = scanLineColor;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = scanLineColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Scan line gradient trail
        const scanGrad = ctx.createLinearGradient(0, scanScreenY - 14, 0, scanScreenY);
        scanGrad.addColorStop(0, isDark ? "rgba(6, 182, 212, 0)" : "rgba(8, 145, 178, 0)");
        scanGrad.addColorStop(1, isDark ? "rgba(6, 182, 212, 0.2)" : "rgba(8, 145, 178, 0.15)");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(centerX - baseScale * 1.1, scanScreenY - 14, baseScale * 2.2, 14);
      }

      // 4. Draw tracking landmark points
      for (const p of projected) {
        const isAnomalyPoint = isDistorting && p.landmark.region === "mouth";
        const radius = p.landmark.isFeaturePoint ? 2.6 : 1.6;

        ctx.beginPath();
        ctx.arc(p.px, p.py, p.isScanned ? radius * 1.7 : radius, 0, Math.PI * 2);

        if (isAnomalyPoint) {
          ctx.fillStyle = isDark ? "#ef4444" : "#dc2626";
        } else if (p.isScanned) {
          ctx.fillStyle = isDark ? "#38bdf8" : "#0891b2";
        } else if (p.landmark.isFeaturePoint) {
          ctx.fillStyle = warningFill;
        } else {
          ctx.fillStyle = nodeFill;
        }
        ctx.fill();

        // Pulsing ring around critical feature points
        if (p.landmark.isFeaturePoint) {
          ctx.beginPath();
          ctx.arc(p.px, p.py, radius * 2.2, 0, Math.PI * 2);
          ctx.strokeStyle = isAnomalyPoint
            ? (isDark ? "rgba(239, 68, 68, 0.5)" : "rgba(220, 38, 38, 0.5)")
            : isDark
            ? "rgba(6, 182, 212, 0.3)"
            : "rgba(14, 116, 144, 0.25)";
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      // 5. Draw biometric targeting HUD reticle brackets
      const reticlePadding = baseScale * 1.05;
      const rLeft = centerX - reticlePadding;
      const rRight = centerX + reticlePadding;
      const rTop = centerY - reticlePadding;
      const rBottom = centerY + reticlePadding * 1.05;
      const bracketLen = 14;

      ctx.strokeStyle = isDistorting
        ? (isDark ? "rgba(239, 68, 68, 0.7)" : "rgba(220, 38, 38, 0.7)")
        : isDark
        ? "rgba(6, 182, 212, 0.45)"
        : "rgba(15, 23, 42, 0.35)";
      ctx.lineWidth = 1.2;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(rLeft, rTop + bracketLen);
      ctx.lineTo(rLeft, rTop);
      ctx.lineTo(rLeft + bracketLen, rTop);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(rRight - bracketLen, rTop);
      ctx.lineTo(rRight, rTop);
      ctx.lineTo(rRight, rTop + bracketLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(rLeft, rBottom - bracketLen);
      ctx.lineTo(rLeft, rBottom);
      ctx.lineTo(rLeft + bracketLen, rBottom);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(rRight - bracketLen, rBottom);
      ctx.lineTo(rRight, rBottom);
      ctx.lineTo(rRight, rBottom - bracketLen);
      ctx.stroke();

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render(performance.now());

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      container?.removeEventListener("mousemove", handleMouseMove);
      container?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)]/80 backdrop-blur-md p-4 transition-all duration-300 shadow-md ${className}`}
    >
      {/* Top Biometric Status Bar */}
      <div className="flex w-full items-center justify-between border-b border-[var(--color-border)] pb-2.5 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--color-text)]">
          <Scan className="h-3.5 w-3.5 text-[var(--color-brand)] animate-pulse" />
          <span>Biometric Voice &amp; Face Mesh</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              currentPhase === "distortion"
                ? "bg-rose-500 animate-ping"
                : currentPhase === "scan"
                ? "bg-sky-400 animate-pulse"
                : "bg-amber-500"
            }`}
          />
          <span
            className={`text-[10px] font-bold tracking-wider ${
              currentPhase === "distortion"
                ? "text-rose-600 dark:text-rose-400"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {currentPhase === "distortion"
              ? "ANOMALY FLAGGED"
              : currentPhase === "scan"
              ? "SCANNING MESH"
              : "MONITORING"}
          </span>
        </div>
      </div>

      {/* Central 3D Canvas Mesh */}
      <div className="relative w-full aspect-[4/3.8] max-h-[340px] flex items-center justify-center my-1">
        <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

        {/* Dynamic Biometric Callout Badge */}
        <div
          className={`absolute bottom-2 left-2 right-2 rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
            currentPhase === "distortion"
              ? "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200"
              : "border-[var(--color-border)] bg-[var(--color-surface-raised)]/90 text-[var(--color-text-muted)]"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono font-bold">
            <span className="flex items-center gap-1">
              <ShieldAlert
                className={`h-3 w-3 ${
                  currentPhase === "distortion" ? "text-rose-500" : "text-[var(--color-brand)]"
                }`}
              />
              {currentPhase === "distortion"
                ? "SYNTHETIC PHONEME-VISEME DESYNC"
                : "ACTIVE CALL SYNTHESIS PROBABILITY"}
            </span>
            <span
              className={`font-mono ${
                currentPhase === "distortion"
                  ? "text-rose-600 dark:text-rose-400 font-black"
                  : "text-[var(--color-text)]"
              }`}
            >
              {currentPhase === "distortion" ? "87.4% SUSPICIOUS" : "EVALUATING"}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)] leading-tight">
            {currentPhase === "distortion"
              ? "Micro-jitter in mouth boundary indicates real-time voice-to-video impersonation."
              : "Multi-point mesh tracking 42 facial topology anchors for audio-visual coherence."}
          </p>
        </div>
      </div>

      {/* Bottom Telemetry Ticker */}
      <div className="flex w-full items-center justify-between border-t border-[var(--color-border)] pt-2 text-[10px] font-mono text-[var(--color-text-faint)]">
        <span>68 FACIAL LANDMARKS</span>
        <span className="text-[var(--color-text-muted)]">3D PERSPECTIVE: ±5° YAW</span>
        <span className="text-[var(--color-brand)] font-semibold">SAFEGUARD ENCLAVE</span>
      </div>
    </div>
  );
}
