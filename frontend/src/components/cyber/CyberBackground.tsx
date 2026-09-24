import { useEffect, useRef } from "react";
import { useTheme } from "../../state/theme";

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  pulsePhase: number;
  pulseSpeed: number;
  isSpecial?: boolean;
}

interface Packet {
  fromIndex: number;
  toIndex: number;
  progress: number;
  speed: number;
  color: string;
}

interface SecurityEvent {
  type: "pulse" | "scanline";
  x?: number;
  y?: number;
  radius?: number;
  maxRadius?: number;
  scanY?: number;
  color: string;
  alpha: number;
  decay: number;
}

// 3D Facial Topology Landmarks for Ambient Hologram
const FACE_3D_POINTS: [number, number, number][] = [
  // Forehead & hairline curve
  [0, -0.92, 0.15],
  [-0.32, -0.88, 0.08],
  [0.32, -0.88, 0.08],
  [-0.58, -0.72, -0.15],
  [0.58, -0.72, -0.15],
  // Temples & Jawline contour
  [-0.72, -0.42, -0.32],
  [0.72, -0.42, -0.32],
  [-0.74, 0.02, -0.35],
  [0.74, 0.02, -0.35],
  [-0.62, 0.44, -0.22],
  [0.62, 0.44, -0.22],
  [-0.38, 0.78, 0.05],
  [0.38, 0.78, 0.05],
  [0, 0.95, 0.28], // Chin
  // Brows
  [-0.52, -0.42, 0.12],
  [-0.34, -0.48, 0.22],
  [-0.14, -0.44, 0.26],
  [0.14, -0.44, 0.26],
  [0.34, -0.48, 0.22],
  [0.52, -0.42, 0.12],
  // Left eye
  [-0.48, -0.28, 0.14],
  [-0.33, -0.33, 0.22],
  [-0.18, -0.28, 0.24],
  [-0.33, -0.22, 0.21],
  // Right eye
  [0.18, -0.28, 0.24],
  [0.33, -0.33, 0.22],
  [0.48, -0.28, 0.14],
  [0.33, -0.22, 0.21],
  // Cheeks
  [-0.55, -0.06, 0.18],
  [0.55, -0.06, 0.18],
  // Nose
  [0, -0.38, 0.32],
  [0, -0.12, 0.46],
  [0, 0.12, 0.58], // Nose tip
  [-0.16, 0.14, 0.36],
  [0.16, 0.14, 0.36],
  [0, 0.24, 0.42],
  // Mouth
  [-0.28, 0.44, 0.26],
  [0, 0.38, 0.45],
  [0.28, 0.44, 0.26],
  [0, 0.56, 0.42],
  [0, 0.46, 0.40],
];

const FACE_EDGES: [number, number][] = [
  // Forehead outline
  [3, 1], [1, 0], [0, 2], [2, 4],
  [3, 5], [4, 6],
  // Jawline
  [5, 7], [7, 9], [9, 11], [11, 13],
  [6, 8], [8, 10], [10, 12], [12, 13],
  // Brow ridge
  [14, 15], [15, 16], [16, 30], [30, 17], [17, 18], [18, 19],
  // Left eye
  [20, 21], [21, 22], [22, 23], [23, 20],
  // Right eye
  [24, 25], [25, 26], [26, 27], [27, 24],
  // Nose
  [30, 31], [31, 32], [32, 35],
  [32, 33], [32, 34], [33, 35], [34, 35],
  // Cheeks & Triangulation
  [20, 28], [28, 33], [28, 9],
  [26, 29], [29, 34], [29, 10],
  [28, 30], [29, 30],
  // Lips
  [36, 37], [37, 38], [38, 39], [39, 36],
  [36, 40], [38, 40], [37, 40], [39, 40],
  // Chin anchor
  [36, 11], [38, 12], [39, 13],
];

export function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme, deepfakeBackground } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersReducedMotion = mediaQuery.matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width - 0.5) * 24;
      targetMouseY = (e.clientY / height - 0.5) * 24;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize);

    // Generate network nodes
    const nodeCount = Math.min(Math.floor((width * height) / 30000), 40);
    const nodes: NetworkNode[] = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        baseRadius: Math.random() * 1.5 + 1.2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        isSpecial: Math.random() < 0.15,
      });
    }

    const packets: Packet[] = [];
    let nextPacketTime = 0;

    // Security event tracking
    let activeEvent: SecurityEvent | null = null;
    let nextEventTime = Date.now() + 6000 + Math.random() * 8000;

    let lastTime = performance.now();
    const cycleStart = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // Theme-specific colors
      const nodeColor = isDark ? "rgba(6, 182, 212, 0.5)" : "rgba(14, 116, 144, 0.45)";
      const specialNodeColor = isDark ? "rgba(245, 158, 11, 0.7)" : "rgba(217, 119, 6, 0.65)";
      const lineColor = isDark ? "rgba(56, 189, 248, " : "rgba(15, 23, 42, ";
      const maxConnectDistance = 140;

      // -------------------------------------------------------------
      // 1. AMBIENT 3D DEEPFAKE FACIAL TOPOLOGY HOLOGRAM (When Enabled)
      // -------------------------------------------------------------
      if (deepfakeBackground) {
        // Hologram position: centered in the viewport with soft perspective
        const faceCenterX = width * 0.5 + mouseX * 0.7;
        const faceCenterY = height * 0.46 + mouseY * 0.7;
        const faceScale = Math.min(width, height) * 0.28;
        const focalLength = 3.4;

        // Periodic lifelike movement cycle (16.5s)
        const elapsed = (now - cycleStart) % 16500;
        let faceYaw = 0;
        let facePitch = 0;
        let scanProgress = -1;
        let isGlitching = false;

        if (!prefersReducedMotion) {
          if (elapsed < 4500) {
            // Calm breathing drift
            const t = elapsed / 4500;
            faceYaw = Math.sin(t * Math.PI * 2) * 0.015;
            facePitch = Math.cos(t * Math.PI * 2) * 0.012;
          } else if (elapsed < 7000) {
            // Slight turn
            const prog = (elapsed - 4500) / 2500;
            const ease = 0.5 - Math.cos(prog * Math.PI) / 2;
            faceYaw = ease * 0.08;
            facePitch = -ease * 0.03;
          } else if (elapsed < 8200) {
            // Pause
            faceYaw = 0.08;
            facePitch = -0.03;
          } else if (elapsed < 11200) {
            // Scanline sweep
            const prog = (elapsed - 8200) / 3000;
            scanProgress = prog;
            faceYaw = 0.08 + Math.sin(prog * Math.PI * 3) * 0.01;
            facePitch = -0.03;
          } else if (elapsed < 13500) {
            // Slight counter-rotation
            const prog = (elapsed - 11200) / 2300;
            const ease = 0.5 - Math.cos(prog * Math.PI) / 2;
            faceYaw = 0.08 - ease * 0.16;
            facePitch = -0.03 + ease * 0.06;
          } else if (elapsed < 14500) {
            faceYaw = -0.08;
            facePitch = 0.03;
          } else {
            // Subtle distortion alert
            isGlitching = true;
            const prog = (elapsed - 14500) / 2000;
            faceYaw = -0.08 * (1 - prog);
            facePitch = 0.03 * (1 - prog);
          }
        }

        // Add mouse parallax to face
        faceYaw += (mouseX / width) * 0.8;
        facePitch -= (mouseY / height) * 0.6;

        const cosY = Math.cos(faceYaw);
        const sinY = Math.sin(faceYaw);
        const cosP = Math.cos(facePitch);
        const sinP = Math.sin(facePitch);

        // Project 3D points
        const projectedFace = FACE_3D_POINTS.map(([lx, ly, lz], idx) => {
          let px = lx;
          let py = ly;
          if (isGlitching && idx > 25) {
            px += (Math.sin(now * 0.04 + idx) + Math.cos(now * 0.02)) * 0.02;
          }

          const x1 = px * cosY + lz * sinY;
          const z1 = -px * sinY + lz * cosY;
          const y2 = py * cosP - z1 * sinP;
          const z2 = py * sinP + z1 * cosP;

          const scale = focalLength / (focalLength + z2);
          const screenX = faceCenterX + x1 * scale * faceScale;
          const screenY = faceCenterY + y2 * scale * faceScale;

          return { screenX, screenY, z: z2 };
        });

        // Ambient Wireframe Mesh Alpha
        const meshBaseAlpha = isDark ? 0.14 : 0.09;
        const meshHighlightAlpha = isDark ? 0.35 : 0.22;

        // Draw outer circular holographic targeting ring
        ctx.beginPath();
        ctx.arc(faceCenterX, faceCenterY, faceScale * 1.25, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? "rgba(6, 182, 212, 0.06)" : "rgba(15, 23, 42, 0.04)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw wireframe edges
        for (const [i1, i2] of FACE_EDGES) {
          const p1 = projectedFace[i1];
          const p2 = projectedFace[i2];
          if (!p1 || !p2) continue;

          ctx.beginPath();
          ctx.moveTo(p1.screenX, p1.screenY);
          ctx.lineTo(p2.screenX, p2.screenY);

          if (isGlitching && (i1 > 30 || i2 > 30)) {
            ctx.strokeStyle = isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(220, 38, 38, 0.3)";
            ctx.lineWidth = 1.2;
          } else {
            ctx.strokeStyle = isDark
              ? `rgba(6, 182, 212, ${meshBaseAlpha})`
              : `rgba(14, 116, 144, ${meshBaseAlpha})`;
            ctx.lineWidth = 0.85;
          }
          ctx.stroke();
        }

        // Draw active laser sweep in background if scanning
        if (scanProgress >= 0) {
          const scanScreenY = faceCenterY - faceScale * 1.2 + scanProgress * faceScale * 2.4;
          ctx.beginPath();
          ctx.moveTo(faceCenterX - faceScale * 1.2, scanScreenY);
          ctx.lineTo(faceCenterX + faceScale * 1.2, scanScreenY);
          ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.35)" : "rgba(8, 145, 178, 0.25)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Draw landmark points
        for (let idx = 0; idx < projectedFace.length; idx++) {
          const pt = projectedFace[idx];
          ctx.beginPath();
          ctx.arc(pt.screenX, pt.screenY, idx % 4 === 0 ? 2 : 1.3, 0, Math.PI * 2);
          if (isGlitching && idx > 30) {
            ctx.fillStyle = isDark ? "rgba(239, 68, 68, 0.5)" : "rgba(220, 38, 38, 0.4)";
          } else if (idx % 5 === 0) {
            ctx.fillStyle = isDark
              ? `rgba(245, 158, 11, ${meshHighlightAlpha})`
              : `rgba(217, 119, 6, ${meshHighlightAlpha})`;
          } else {
            ctx.fillStyle = isDark
              ? `rgba(6, 182, 212, ${meshHighlightAlpha})`
              : `rgba(14, 116, 144, ${meshHighlightAlpha})`;
          }
          ctx.fill();
        }
      }

      // -------------------------------------------------------------
      // 2. OCCASIONAL SECURITY EVENTS (Pulses, Sweeps)
      // -------------------------------------------------------------
      if (Date.now() > nextEventTime && !activeEvent) {
        const eventType = Math.random() > 0.4 ? "pulse" : "scanline";
        if (eventType === "pulse" && nodes.length > 0) {
          const originNode = nodes[Math.floor(Math.random() * nodes.length)];
          activeEvent = {
            type: "pulse",
            x: originNode.x,
            y: originNode.y,
            radius: 2,
            maxRadius: 180 + Math.random() * 100,
            color: Math.random() > 0.6
              ? (isDark ? "rgba(245, 158, 11, " : "rgba(217, 119, 6, ")
              : (isDark ? "rgba(239, 68, 68, " : "rgba(220, 38, 38, "),
            alpha: 0.35,
            decay: 0.005,
          };
        } else {
          activeEvent = {
            type: "scanline",
            scanY: 0,
            color: isDark ? "rgba(6, 182, 212, " : "rgba(8, 145, 178, ",
            alpha: 0.3,
            decay: 0.003,
          };
        }
        nextEventTime = Date.now() + 11000 + Math.random() * 12000;
      }

      // Draw and advance security event
      if (activeEvent) {
        if (activeEvent.type === "pulse" && activeEvent.x !== undefined && activeEvent.y !== undefined) {
          activeEvent.radius = (activeEvent.radius || 0) + 1.2;
          activeEvent.alpha -= activeEvent.decay;

          ctx.beginPath();
          ctx.arc(
            activeEvent.x + mouseX * 0.5,
            activeEvent.y + mouseY * 0.5,
            activeEvent.radius,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = `${activeEvent.color}${Math.max(0, activeEvent.alpha)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          if (activeEvent.alpha <= 0 || (activeEvent.radius || 0) >= (activeEvent.maxRadius || 200)) {
            activeEvent = null;
          }
        } else if (activeEvent.type === "scanline" && activeEvent.scanY !== undefined) {
          activeEvent.scanY += 3.5;
          ctx.beginPath();
          ctx.moveTo(0, activeEvent.scanY);
          ctx.lineTo(width, activeEvent.scanY);
          ctx.strokeStyle = `${activeEvent.color}${Math.max(0, activeEvent.alpha)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (activeEvent.scanY >= height) {
            activeEvent = null;
          }
        }
      }

      // -------------------------------------------------------------
      // 3. LIVING NETWORK NODES & CONNECTIONS
      // -------------------------------------------------------------
      ctx.lineWidth = 0.75;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        if (!prefersReducedMotion) {
          n1.x += n1.vx;
          n1.y += n1.vy;
          n1.pulsePhase += n1.pulseSpeed;

          if (n1.x < -20) n1.x = width + 20;
          if (n1.x > width + 20) n1.x = -20;
          if (n1.y < -20) n1.y = height + 20;
          if (n1.y > height + 20) n1.y = -20;
        }

        const posX1 = n1.x + mouseX;
        const posY1 = n1.y + mouseY;

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const posX2 = n2.x + mouseX;
          const posY2 = n2.y + mouseY;

          const dx = posX1 - posX2;
          const dy = posY1 - posY2;
          const dist = Math.hypot(dx, dy);

          if (dist < maxConnectDistance) {
            const opacityFactor = 1 - dist / maxConnectDistance;
            const lineAlpha = (isDark ? 0.15 : 0.08) * opacityFactor;
            ctx.beginPath();
            ctx.moveTo(posX1, posY1);
            ctx.lineTo(posX2, posY2);
            ctx.strokeStyle = `${lineColor}${lineAlpha.toFixed(3)})`;
            ctx.stroke();

            // Spawn data packet
            if (!prefersReducedMotion && now > nextPacketTime && Math.random() < 0.04 && packets.length < 8) {
              packets.push({
                fromIndex: i,
                toIndex: j,
                progress: 0,
                speed: 0.35 + Math.random() * 0.45,
                color: isDark ? "#38bdf8" : "#0891b2",
              });
              nextPacketTime = now + 400 + Math.random() * 600;
            }
          }
        }
      }

      // 4. Draw data packets
      if (!prefersReducedMotion) {
        for (let k = packets.length - 1; k >= 0; k--) {
          const p = packets[k];
          p.progress += p.speed * dt;
          if (p.progress >= 1) {
            packets.splice(k, 1);
            continue;
          }
          const from = nodes[p.fromIndex];
          const to = nodes[p.toIndex];
          if (!from || !to) {
            packets.splice(k, 1);
            continue;
          }
          const px = from.x + (to.x - from.x) * p.progress + mouseX;
          const py = from.y + (to.y - from.y) * p.progress + mouseY;

          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }

      // 5. Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = Math.sin(n.pulsePhase) * 0.4 + 1;
        const radius = n.baseRadius * pulse;
        const px = n.x + mouseX;
        const py = n.y + mouseY;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = n.isSpecial ? specialNodeColor : nodeColor;
        ctx.fill();

        if (n.isSpecial) {
          ctx.beginPath();
          ctx.arc(px, py, radius * 2.2, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(217, 119, 6, 0.15)";
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDark, deepfakeBackground]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-opacity duration-700"
    >
      <canvas ref={canvasRef} className="block w-full h-full opacity-85 dark:opacity-95" />
      {/* Soft radial vignette to preserve text contrast */}
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-[var(--color-bg)]/75 pointer-events-none" />
    </div>
  );
}
