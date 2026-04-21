"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  CSSProperties,
} from "react";

type Phase = "setup" | "shooting" | "preview" | "result";
type TabId = "layout" | "filter" | "frame" | "adjust" | "sticker" | "face";

interface Filter { name: string; value: string; css: string; icon: string; }
interface FrameDef { name: string; value: string; bgColor: string; bgGradient?: [string, string]; borderColor?: string; borderPx?: number; labelColor: string; previewSwatch: string; divStyle: CSSProperties; labelTop?: string; label?: string; }
interface Layout { name: string; icon: string; cols: number; count: number; isStrip?: boolean; }
interface Sticker { id: number; emoji: string; x: number; y: number; size: number; rotate: number; }
interface CameraDevice { deviceId: string; label: string; }

interface FaceLandmarks {
  nose: { x: number; y: number };
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  leftMouth: { x: number; y: number };
  rightMouth: { x: number; y: number };
  jaw: { x: number; y: number };
  faceW: number;
  faceH: number;
  topHead: { x: number; y: number };
}

interface FaceOverlayDef {
  id: string;
  label: string;
  icon: string;
  draw: (ctx: CanvasRenderingContext2D, lm: FaceLandmarks) => void;
}

// ── Face Overlay Definitions ──────────────────────────────────────────────────
const FACE_OVERLAYS: FaceOverlayDef[] = [
  { id: "none", label: "Normal", icon: "🚫", draw: () => {} },
  {
    id: "mustache", label: "Kumis", icon: "👨",
    draw(ctx, lm) {
      const { nose, leftMouth, rightMouth } = lm;
      const mw = (rightMouth.x - leftMouth.x) * 0.92;
      const my = nose.y + (leftMouth.y - nose.y) * 0.38;
      ctx.save();
      ctx.fillStyle = "#1a0800";
      ctx.beginPath();
      ctx.moveTo(nose.x, my);
      ctx.bezierCurveTo(nose.x - mw*0.15, my - mw*0.18, nose.x - mw*0.55, my - mw*0.2, nose.x - mw*0.55, my + mw*0.09);
      ctx.bezierCurveTo(nose.x - mw*0.55, my + mw*0.2, nose.x - mw*0.1, my + mw*0.09, nose.x, my);
      ctx.bezierCurveTo(nose.x + mw*0.1, my + mw*0.09, nose.x + mw*0.55, my + mw*0.2, nose.x + mw*0.55, my + mw*0.09);
      ctx.bezierCurveTo(nose.x + mw*0.55, my - mw*0.2, nose.x + mw*0.15, my - mw*0.18, nose.x, my);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: "mustache_curly", label: "Kumis Keriting", icon: "🎩",
    draw(ctx, lm) {
      const { nose, leftMouth, rightMouth } = lm;
      const mw = (rightMouth.x - leftMouth.x) * 1.0;
      const my = nose.y + (leftMouth.y - nose.y) * 0.42;
      ctx.save();
      ctx.strokeStyle = "#2a0a00";
      ctx.lineWidth = lm.faceW * 0.03;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(nose.x - 0.02*mw, my);
      ctx.bezierCurveTo(nose.x - mw*0.25, my - mw*0.18, nose.x - mw*0.5, my - mw*0.05, nose.x - mw*0.47, my + mw*0.07);
      ctx.bezierCurveTo(nose.x - mw*0.44, my + mw*0.16, nose.x - mw*0.6, my + mw*0.24, nose.x - mw*0.72, my + mw*0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(nose.x + 0.02*mw, my);
      ctx.bezierCurveTo(nose.x + mw*0.25, my - mw*0.18, nose.x + mw*0.5, my - mw*0.05, nose.x + mw*0.47, my + mw*0.07);
      ctx.bezierCurveTo(nose.x + mw*0.44, my + mw*0.16, nose.x + mw*0.6, my + mw*0.24, nose.x + mw*0.72, my + mw*0.1);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: "beard", label: "Jenggot", icon: "🧔",
    draw(ctx, lm) {
      const { nose, leftMouth, rightMouth, jaw } = lm;
      const bw = (rightMouth.x - leftMouth.x) * 1.32;
      const by = leftMouth.y + lm.faceH * 0.04;
      const bh = (jaw.y - leftMouth.y) * 0.88;
      ctx.save();
      ctx.fillStyle = "#1a0800";
      ctx.beginPath();
      ctx.moveTo(nose.x - bw*0.5, by);
      ctx.bezierCurveTo(nose.x - bw*0.56, by + bh*0.5, nose.x - bw*0.32, by + bh, nose.x, by + bh*1.05);
      ctx.bezierCurveTo(nose.x + bw*0.32, by + bh, nose.x + bw*0.56, by + bh*0.5, nose.x + bw*0.5, by);
      ctx.bezierCurveTo(nose.x + bw*0.3, by - bh*0.04, nose.x - bw*0.3, by - bh*0.04, nose.x - bw*0.5, by);
      ctx.fill();
      const mw = (rightMouth.x - leftMouth.x) * 0.88;
      const my = nose.y + (leftMouth.y - nose.y) * 0.42;
      ctx.beginPath();
      ctx.moveTo(nose.x, my);
      ctx.bezierCurveTo(nose.x-mw*0.12, my-mw*0.14, nose.x-mw*0.5, my-mw*0.18, nose.x-mw*0.5, my+mw*0.08);
      ctx.bezierCurveTo(nose.x-mw*0.5, my+mw*0.18, nose.x-mw*0.08, my+mw*0.08, nose.x, my);
      ctx.bezierCurveTo(nose.x+mw*0.08, my+mw*0.08, nose.x+mw*0.5, my+mw*0.18, nose.x+mw*0.5, my+mw*0.08);
      ctx.bezierCurveTo(nose.x+mw*0.5, my-mw*0.18, nose.x+mw*0.12, my-mw*0.14, nose.x, my);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: "glasses", label: "Kacamata", icon: "👓",
    draw(ctx, lm) {
      const { leftEye, rightEye } = lm;
      const r = lm.faceW * 0.145;
      ctx.save();
      ctx.strokeStyle = "#111"; ctx.lineWidth = lm.faceW * 0.016;
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      [leftEye, rightEye].forEach(e => { ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r*0.72, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(leftEye.x+r, leftEye.y); ctx.lineTo(rightEye.x-r, rightEye.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(leftEye.x-r, leftEye.y); ctx.lineTo(leftEye.x-r*1.9, leftEye.y-r*0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rightEye.x+r, rightEye.y); ctx.lineTo(rightEye.x+r*1.9, rightEye.y-r*0.15); ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: "sunglasses", label: "Kacamata Hitam", icon: "😎",
    draw(ctx, lm) {
      const { leftEye, rightEye } = lm;
      const r = lm.faceW * 0.16;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.strokeStyle = "#222"; ctx.lineWidth = lm.faceW * 0.018;
      ctx.beginPath(); ctx.ellipse(leftEye.x, leftEye.y, r, r*0.62, -0.08, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(rightEye.x, rightEye.y, r, r*0.62, 0.08, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#333"; ctx.lineWidth = lm.faceW * 0.014;
      ctx.beginPath(); ctx.moveTo(leftEye.x+r*0.85, leftEye.y); ctx.lineTo(rightEye.x-r*0.85, rightEye.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(leftEye.x-r*0.95, leftEye.y-r*0.1); ctx.lineTo(leftEye.x-r*1.9, leftEye.y-r*0.22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rightEye.x+r*0.95, rightEye.y-r*0.1); ctx.lineTo(rightEye.x+r*1.9, rightEye.y-r*0.22); ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: "crown", label: "Mahkota", icon: "👑",
    draw(ctx, lm) {
      const cx = (lm.leftEye.x + lm.rightEye.x) / 2;
      const cw = lm.faceW * 1.0, ch = lm.faceW * 0.38;
      const cy = lm.topHead.y - ch * 0.1;
      ctx.save();
      ctx.fillStyle = "#FFD700"; ctx.strokeStyle = "#B8860B"; ctx.lineWidth = lm.faceW * 0.012;
      ctx.beginPath();
      ctx.moveTo(cx-cw/2, cy+ch*0.45);
      ctx.lineTo(cx-cw/2, cy-ch*0.1);
      ctx.lineTo(cx-cw*0.3, cy+ch*0.2);
      ctx.lineTo(cx-cw*0.1, cy-ch*0.5);
      ctx.lineTo(cx, cy-ch*0.85);
      ctx.lineTo(cx+cw*0.1, cy-ch*0.5);
      ctx.lineTo(cx+cw*0.3, cy+ch*0.2);
      ctx.lineTo(cx+cw/2, cy-ch*0.1);
      ctx.lineTo(cx+cw/2, cy+ch*0.45);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      [{ x: cx-cw*0.3, c: "#ff2d9e" }, { x: cx, c: "#38bdf8" }, { x: cx+cw*0.3, c: "#a855f7" }].forEach(g => {
        ctx.fillStyle = g.c; ctx.beginPath(); ctx.arc(g.x, cy+ch*0.1, lm.faceW*0.035, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }
  },
  {
    id: "bunnyears", label: "Telinga Kelinci", icon: "🐰",
    draw(ctx, lm) {
      const cx = (lm.leftEye.x + lm.rightEye.x) / 2;
      const ew = lm.faceW * 0.16, eh = lm.faceH * 0.78;
      const offX = lm.faceW * 0.22;
      ctx.save();
      [[cx-offX,-0.12],[cx+offX,0.12]].forEach(([ex,rot]) => {
        ctx.fillStyle = "#f9c0d0";
        ctx.beginPath(); ctx.ellipse(ex as number, lm.topHead.y-eh*0.48, ew*0.84, eh*0.55, rot as number, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#ff9eb5";
        ctx.beginPath(); ctx.ellipse(ex as number, lm.topHead.y-eh*0.48, ew*0.4, eh*0.33, rot as number, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }
  },
  {
    id: "devilhorns", label: "Tanduk Iblis", icon: "😈",
    draw(ctx, lm) {
      const cx = (lm.leftEye.x + lm.rightEye.x) / 2;
      const hw = lm.faceW * 0.14, hh = lm.faceW * 0.34;
      ctx.save();
      [[cx-lm.faceW*0.28,-0.15],[cx+lm.faceW*0.28,0.15]].forEach(([hx,rot]) => {
        ctx.fillStyle = "#cc0000";
        ctx.save(); ctx.translate(hx as number, lm.topHead.y); ctx.rotate(rot as number);
        ctx.beginPath(); ctx.moveTo(-hw/2,0); ctx.lineTo(0,-hh); ctx.lineTo(hw/2,0);
        ctx.bezierCurveTo(hw*0.3, hh*0.15, -hw*0.3, hh*0.15, -hw/2, 0);
        ctx.fill(); ctx.restore();
      });
      ctx.restore();
    }
  },
  {
    id: "clownface", label: "Badut", icon: "🤡",
    draw(ctx, lm) {
      const { nose, leftEye, rightEye, leftMouth, rightMouth } = lm;
      ctx.save();
      ctx.fillStyle = "#ff1111"; ctx.shadowColor = "#ff000088"; ctx.shadowBlur = lm.faceW*0.04;
      ctx.beginPath(); ctx.arc(nose.x, nose.y, lm.faceW*0.075, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.45;
      [[leftEye.x-lm.faceW*0.04, leftEye.y+lm.faceH*0.15, "#ff6699"], [rightEye.x+lm.faceW*0.04, rightEye.y+lm.faceH*0.15, "#ff9966"]].forEach(([x,y,c]) => {
        ctx.fillStyle = c as string; ctx.beginPath(); ctx.arc(x as number, y as number, lm.faceW*0.1, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#cc0000"; ctx.lineWidth = lm.faceW*0.022; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(leftMouth.x-lm.faceW*0.07, leftMouth.y-lm.faceH*0.02);
      ctx.quadraticCurveTo(nose.x, rightMouth.y+lm.faceH*0.09, rightMouth.x+lm.faceW*0.07, rightMouth.y-lm.faceH*0.02);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: "eyebrows_thick", label: "Alis Tebal", icon: "🤨",
    draw(ctx, lm) {
      const { leftEye, rightEye } = lm;
      const bw = lm.faceW * 0.2, bh = lm.faceW * 0.058;
      const by = lm.faceH * 0.085;
      ctx.save(); ctx.fillStyle = "#1a0800";
      [[leftEye, -0.18],[rightEye, 0.18]].forEach(([eye, tilt]) => {
        const e = eye as { x: number; y: number };
        ctx.save(); ctx.translate(e.x, e.y - by); ctx.rotate(tilt as number);
        ctx.beginPath(); ctx.roundRect(-bw/2, -bh/2, bw, bh, bh/2); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }
  },
  {
    id: "hat_top", label: "Topi Tuxedo", icon: "🎩",
    draw(ctx, lm) {
      const cx = (lm.leftEye.x + lm.rightEye.x) / 2;
      const brimW = lm.faceW*1.15, brimH = lm.faceW*0.09;
      const hatW = lm.faceW*0.72, hatH = lm.faceW*0.6;
      const baseY = lm.topHead.y + lm.faceW*0.04;
      ctx.save();
      ctx.fillStyle = "#0a0a0a"; ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx-hatW/2, baseY-hatH, hatW, hatH, [4,4,0,0]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(cx-hatW/2, baseY-hatH*0.18, hatW, hatH*0.16);
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath(); ctx.ellipse(cx, baseY, brimW/2, brimH/2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: "blush", label: "Pipi Merah", icon: "☺️",
    draw(ctx, lm) {
      const { leftEye, rightEye } = lm;
      const r = lm.faceW * 0.12;
      ctx.save(); ctx.globalAlpha = 0.5;
      [[leftEye.x-lm.faceW*0.04, leftEye.y+lm.faceH*0.17], [rightEye.x+lm.faceW*0.04, rightEye.y+lm.faceH*0.17]].forEach(([x,y]) => {
        const g = ctx.createRadialGradient(x as number, y as number, 0, x as number, y as number, r);
        g.addColorStop(0, "#ff6b8a"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x as number, y as number, r, r*0.65, 0, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }
  },
  {
    id: "dog", label: "Anjing", icon: "🐶",
    draw(ctx, lm) {
      const { nose, leftEye, rightEye, leftMouth, rightMouth } = lm;
      const cx = (leftEye.x + rightEye.x) / 2;
      ctx.save();
      ctx.fillStyle = "#8B4513";
      [[cx-lm.faceW*0.44, lm.topHead.y+lm.faceH*0.08, 0.28],[cx+lm.faceW*0.44, lm.topHead.y+lm.faceH*0.08, -0.28]].forEach(([x,y,r]) => {
        ctx.save(); ctx.translate(x as number, y as number); ctx.rotate(r as number);
        ctx.beginPath(); ctx.ellipse(0, 0, lm.faceW*0.13, lm.faceH*0.22, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.ellipse(nose.x, nose.y, lm.faceW*0.073, lm.faceW*0.05, 0, 0, Math.PI*2); ctx.fill();
      const ty = (leftMouth.y + rightMouth.y) / 2 + lm.faceH*0.01;
      ctx.fillStyle = "#ff6b8a";
      ctx.beginPath(); ctx.ellipse(nose.x, ty+lm.faceW*0.085, lm.faceW*0.1, lm.faceW*0.135, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#ff4488";
      ctx.beginPath(); ctx.ellipse(nose.x, ty+lm.faceW*0.17, lm.faceW*0.04, lm.faceW*0.035, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  {
    id: "catears", label: "Telinga Kucing", icon: "🐱",
    draw(ctx, lm) {
      const cx = (lm.leftEye.x + lm.rightEye.x) / 2;
      const offX = lm.faceW * 0.26;
      const earH = lm.faceH * 0.48;
      const earW = lm.faceW * 0.18;
      ctx.save();
      [[cx-offX,-0.22],[cx+offX,0.22]].forEach(([ex, rot]) => {
        ctx.save(); ctx.translate(ex as number, lm.topHead.y+earH*0.1); ctx.rotate(rot as number);
        ctx.fillStyle = "#e0a0c0";
        ctx.beginPath(); ctx.moveTo(0, -earH*0.55); ctx.lineTo(-earW*0.5, earH*0.1); ctx.lineTo(earW*0.5, earH*0.1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffcce0";
        ctx.beginPath(); ctx.moveTo(0, -earH*0.38); ctx.lineTo(-earW*0.28, earH*0.05); ctx.lineTo(earW*0.28, earH*0.05); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }
  },
  {
    id: "rainbow", label: "Pelangi & Bintang", icon: "🌈",
    draw(ctx, lm) {
      const cx = (lm.leftEye.x + lm.rightEye.x) / 2;
      const r = lm.faceW * 0.72;
      const cy = lm.topHead.y + r * 0.12;
      ctx.save(); ctx.lineWidth = lm.faceW * 0.045; ctx.lineCap = "round";
      [["#ff0000",r],["#ff7700",r-lm.faceW*0.055],["#ffee00",r-lm.faceW*0.11],["#00cc00",r-lm.faceW*0.165],["#0066ff",r-lm.faceW*0.22]].forEach(([c,rad]) => {
        ctx.strokeStyle = c as string;
        ctx.beginPath(); ctx.arc(cx, cy, rad as number, Math.PI, 0); ctx.stroke();
      });
      // Stars
      [[cx-lm.faceW*0.62, lm.topHead.y+lm.faceH*0.05,"#FFD700"],[cx+lm.faceW*0.62, lm.topHead.y+lm.faceH*0.05,"#FFD700"],[cx, lm.topHead.y-lm.faceH*0.04,"#fff"]].forEach(([sx,sy,sc]) => {
        ctx.fillStyle = sc as string; ctx.font = `${lm.faceW*0.12}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⭐", sx as number, sy as number);
      });
      ctx.restore();
    }
  },
];

const FILTERS: Filter[] = [
  { name: "Normal",    value: "none",      css: "",                                                icon: "○" },
  { name: "Grayscale", value: "grayscale", css: "grayscale(100%)",                                 icon: "◑" },
  { name: "Sepia",     value: "sepia",     css: "sepia(80%)",                                      icon: "◐" },
  { name: "Vivid",     value: "vivid",     css: "saturate(220%) contrast(115%)",                   icon: "◉" },
  { name: "Cool",      value: "cool",      css: "hue-rotate(180deg) saturate(130%)",               icon: "❄" },
  { name: "Warm",      value: "warm",      css: "sepia(40%) saturate(160%) hue-rotate(-20deg)",    icon: "☀" },
  { name: "Fade",      value: "fade",      css: "brightness(115%) contrast(82%) saturate(80%)",   icon: "◌" },
  { name: "Neon",      value: "neon",      css: "saturate(300%) contrast(130%) hue-rotate(90deg)", icon: "✦" },
  { name: "Drama",     value: "drama",     css: "contrast(150%) brightness(80%) saturate(120%)",  icon: "◆" },
  { name: "Dreamy",    value: "dreamy",    css: "brightness(110%) saturate(80%)",                  icon: "✿" },
];

const FRAMES: FrameDef[] = [
  { name:"None",value:"none",bgColor:"#111",labelColor:"#888",previewSwatch:"background:#1a1a1a;border:2px dashed #444",divStyle:{background:"transparent",padding:0} },
  { name:"Classic",value:"classic",bgColor:"#0d0d0d",labelColor:"#aaaaaa",labelTop:"✦ PHOTOBOOTH ✦",label:"MEMORIES",previewSwatch:"background:#0d0d0d",divStyle:{background:"#0d0d0d",borderRadius:4,boxShadow:"0 8px 32px rgba(0,0,0,0.9)"} },
  { name:"Vintage",value:"vintage",bgColor:"#6b4c2e",bgGradient:["#4a3220","#c49a6c"],labelColor:"#f5e6c8",labelTop:"⬡ VINTAGE MEMORIES ⬡",label:"VINTAGE MEMORIES",previewSwatch:"background:linear-gradient(135deg,#7c5c3a,#c49a6c)",divStyle:{background:"linear-gradient(160deg,#4a3220 0%,#c49a6c 50%,#4a3220 100%)",borderRadius:6,boxShadow:"0 6px 28px rgba(0,0,0,0.7)"} },
  { name:"Neon Pink",value:"neonpink",bgColor:"#08050d",borderColor:"#ff2d9e",borderPx:6,labelColor:"#ff2d9e",labelTop:"✦ NEON VIBES ✦",label:"✦ NEON ✦",previewSwatch:"background:#0a0a0a;border:3px solid #ff2d9e;box-shadow:0 0 12px #ff2d9e88",divStyle:{background:"#08050d",borderRadius:6,border:"2px solid #ff2d9e",boxShadow:"0 0 24px #ff2d9e55"} },
  { name:"Gold",value:"gold",bgColor:"#1a1400",bgGradient:["#0d0900","#2e2400"],borderColor:"#D4AF37",borderPx:5,labelColor:"#D4AF37",labelTop:"✦ GOLDEN MOMENTS ✦",label:"✦ GOLDEN ✦",previewSwatch:"background:linear-gradient(135deg,#7a5f00,#D4AF37,#7a5f00)",divStyle:{background:"linear-gradient(160deg,#0d0900 0%,#2e2400 50%,#0d0900 100%)",borderRadius:4,border:"2px solid #D4AF37",boxShadow:"0 0 20px rgba(212,175,55,0.25)"} },
  { name:"White",value:"white",bgColor:"#ffffff",labelColor:"#555555",labelTop:"PHOTO STRIP",label:"MAKE MEMORIES",previewSwatch:"background:#ffffff",divStyle:{background:"#ffffff",borderRadius:2,boxShadow:"0 4px 40px rgba(0,0,0,0.5)"} },
  { name:"Pastel",value:"pastel",bgColor:"#ffe4f0",bgGradient:["#ffe4f0","#d4f5e0"],labelColor:"#aa5577",labelTop:"✿ SWEET MOMENTS ✿",label:"SWEET MOMENTS",previewSwatch:"background:linear-gradient(135deg,#ffd6e0,#c8e6ff,#d4f5c4)",divStyle:{background:"linear-gradient(160deg,#ffe4f0 0%,#dde8ff 50%,#d4f5e0 100%)",borderRadius:12,boxShadow:"0 4px 32px rgba(0,0,0,0.3)"} },
  { name:"Dark Film",value:"darkfilm",bgColor:"#0e0e0e",labelColor:"#666666",labelTop:"◼ FILM ROLL ◼",label:"◼ FILM ◼",previewSwatch:"background:#111",divStyle:{background:"#0e0e0e",boxShadow:"0 8px 40px rgba(0,0,0,0.95)"} },
];

const STICKERS = ["⭐","💫","🌟","❤️","🌸","🎉","✨","🦋","🌈","🎀","🔥","💎","🍒","🌙","☁️","🦄","💐","🎊","🍭","🪄","💌","🌺","🐝","🎵"];
const LAYOUTS: Layout[] = [
  { name:"Solo",    icon:"▣",  cols:1, count:1 },
  { name:"Duo",     icon:"▣▣", cols:2, count:2 },
  { name:"Quad",    icon:"⊞",  cols:2, count:4 },
  { name:"Strip 3", icon:"▤",  cols:1, count:3, isStrip:true },
  { name:"Strip 4", icon:"▤▤", cols:1, count:4, isStrip:true },
];
const TIMER_OPTIONS = [3, 5, 10];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Live Frame Preview ────────────────────────────────────────────────────────
function LiveFramePreview({ frame, layout, photos, topText, bottomText, liveVideoSrc }: {
  frame: FrameDef; layout: Layout; photos: string[]; topText: string; bottomText: string; liveVideoSrc: MediaStream | null;
}) {
  const vRef = useRef<HTMLVideoElement>(null);
  const isLight = frame.value === "white" || frame.value === "pastel";
  useEffect(() => { if (vRef.current && liveVideoSrc) vRef.current.srcObject = liveVideoSrc; }, [liveVideoSrc]);
  const cells = Array.from({ length: layout.count }).map((_, i) => photos[i] || null);
  return (
    <div style={{ width:"100%",borderRadius:10,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",background:"#0b0b12" }}>
      <p style={{ fontSize:8.5,letterSpacing:2,color:"#333",textAlign:"center",margin:"8px 0 6px",textTransform:"uppercase" }}>Live Preview</p>
      <div style={{ ...frame.divStyle,padding:frame.value==="none"?"4px":frame.value==="darkfilm"?"10% 6% 10%":"6% 6% 6%",display:"flex",flexDirection:"column",alignItems:"stretch",position:"relative",minHeight:120 }}>
        {frame.value==="darkfilm"&&<><div style={{ position:"absolute",left:3,top:"10%",bottom:"10%",display:"flex",flexDirection:"column",justifyContent:"space-around",pointerEvents:"none" }}>{Array.from({length:5}).map((_,i)=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#2e2e2e" }}/>)}</div><div style={{ position:"absolute",right:3,top:"10%",bottom:"10%",display:"flex",flexDirection:"column",justifyContent:"space-around",pointerEvents:"none" }}>{Array.from({length:5}).map((_,i)=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#2e2e2e" }}/>)}</div></>}
        {frame.value!=="none"&&<div style={{ textAlign:"center",fontSize:"clamp(6px,1.4vw,9px)",letterSpacing:2,fontWeight:700,color:isLight?"#777":frame.labelColor,paddingBottom:"3%",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontFamily:"'Courier New',monospace" }}>{topText||frame.labelTop||"✦ PHOTOBOOTH ✦"}</div>}
        <div style={{ display:"grid",gridTemplateColumns:`repeat(${layout.cols},1fr)`,gap:"2%" }}>
          {cells.map((src,i)=>(
            <div key={i} style={{ position:"relative",width:"100%",aspectRatio:"4/3",background:"#111",borderRadius:2,overflow:"hidden" }}>
              {src?<img src={src} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",display:"block" }}/>:liveVideoSrc&&i===0?<video ref={vRef} autoPlay playsInline muted style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",transform:"scaleX(-1)" }}/>:<div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#222",fontSize:18 }}>📷</div>}
            </div>
          ))}
        </div>
        {frame.value!=="none"&&<div style={{ textAlign:"center",fontSize:"clamp(6px,1.4vw,9px)",letterSpacing:2,fontWeight:700,paddingTop:"3%",color:isLight?"#666":frame.labelColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontFamily:"'Courier New',monospace" }}>{bottomText||frame.label||"✦ PHOTOBOOTH ✦"}</div>}
      </div>
    </div>
  );
}

// ── Face Overlay Canvas ───────────────────────────────────────────────────────
function FaceOverlayCanvas({ videoEl, overlay, mirror, active }: {
  videoEl: HTMLVideoElement | null; overlay: FaceOverlayDef; mirror: boolean; active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const faRef     = useRef<{ loaded: boolean; api: any }>({ loaded: false, api: null });
  const [status, setStatus] = useState<"idle"|"loading"|"ready"|"error">("idle");

  useEffect(() => {
    if (!active || overlay.id === "none") return;
    if (faRef.current.loaded) return;
    setStatus("loading");
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.onload = async () => {
      try {
        const fa = (window as any).faceapi;
        const MODEL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";
        await fa.nets.tinyFaceDetector.loadFromUri(MODEL);
        await fa.nets.faceLandmark68TinyNet.loadFromUri(MODEL);
        faRef.current = { loaded: true, api: fa };
        setStatus("ready");
      } catch { setStatus("error"); }
    };
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, [active, overlay.id]);

  useEffect(() => {
    if (!active || overlay.id === "none" || !videoEl) {
      if (canvasRef.current) { const c = canvasRef.current.getContext("2d"); c?.clearRect(0,0,canvasRef.current.width,canvasRef.current.height); }
      return;
    }
    const canvas = canvasRef.current; if (!canvas) return;
    let running = true;

    const loop = async () => {
      if (!running) return;
      if (!videoEl.videoWidth) { rafRef.current = requestAnimationFrame(loop); return; }
      const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
      if (canvas.width !== vw) canvas.width = vw;
      if (canvas.height !== vh) canvas.height = vh;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, vw, vh);

      if (status === "ready" && faRef.current.loaded) {
        try {
          const fa = faRef.current.api;
          const dets = await fa.detectAllFaces(videoEl, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.42 })).withFaceLandmarks(true);
          dets.forEach((d: any) => {
            const lms = d.landmarks;
            const avg = (arr: any[], flipX = false) => ({
              x: flipX ? arr.reduce((s: number, p: any) => s + (vw - p.x), 0) / arr.length : arr.reduce((s: number, p: any) => s + p.x, 0) / arr.length,
              y: arr.reduce((s: number, p: any) => s + p.y, 0) / arr.length
            });
            const flip = mirror;
            const leftEye  = avg(lms.getLeftEye(),  flip);
            const rightEye = avg(lms.getRightEye(), flip);
            const nose     = avg(lms.getNose().slice(3,7), flip);
            const mouthAll = lms.getMouth();
            const leftMouth  = { x: flip ? vw - mouthAll[0].x : mouthAll[0].x, y: mouthAll[0].y };
            const rightMouth = { x: flip ? vw - mouthAll[6].x : mouthAll[6].x, y: mouthAll[6].y };
            const jaw = avg(lms.getJawOutline().slice(6,11), flip);
            const eyeMidY = (leftEye.y + rightEye.y) / 2;
            const faceW = Math.abs(rightEye.x - leftEye.x) * 2.55;
            const faceH = (jaw.y - eyeMidY) * 1.0;
            const topHead = { x: (leftEye.x + rightEye.x) / 2, y: eyeMidY - faceH * 0.88 };
            overlay.draw(ctx, { nose, leftEye, rightEye, leftMouth, rightMouth, jaw, faceW, faceH, topHead });
          });
        } catch { /* skip frame */ }
      } else if (status === "loading") {
        ctx.save(); ctx.fillStyle = "rgba(168,85,247,0.8)"; ctx.font = `bold ${Math.max(11,vw*0.018)}px 'Courier New'`;
        ctx.textAlign = "center"; ctx.fillText("⏳ Memuat AI wajah...", vw/2, vh-16); ctx.restore();
      }
      if (running) rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [active, overlay, mirror, videoEl, status]);

  if (!active || overlay.id === "none") return null;
  return (
    <canvas ref={canvasRef} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",transform:mirror?"scaleX(-1)":"none",zIndex:4 }} />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Photobooth() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelRef = useRef(false);

  const [phase, setPhase]               = useState<Phase>("setup");
  const [cameraOn, setCameraOn]         = useState(false);
  const [filter, setFilter]             = useState<Filter>(FILTERS[0]);
  const [frame, setFrame]               = useState<FrameDef>(FRAMES[0]);
  const [layout, setLayout]             = useState<Layout>(LAYOUTS[0]);
  const [photos, setPhotos]             = useState<string[]>([]);
  const [countdown, setCountdown]       = useState<number | null>(null);
  const [flash, setFlash]               = useState(false);
  const [capturing, setCapturing]       = useState(false);
  const [captureIdx, setCaptureIdx]     = useState(0);
  const [stickers, setStickers]         = useState<Sticker[]>([]);
  const [error, setError]               = useState<string | null>(null);
  const [cameras, setCameras]           = useState<CameraDevice[]>([]);
  const [activeCam, setActiveCam]       = useState<string>("");
  const [timer, setTimer]               = useState(3);
  const [brightness, setBrightness]     = useState(100);
  const [contrast, setContrast]         = useState(100);
  const [mirror, setMirror]             = useState(true);
  const [showGrid, setShowGrid]         = useState(false);
  const [tab, setTab]                   = useState<TabId>("layout");
  const [dragId, setDragId]             = useState<number | null>(null);
  const [topText, setTopText]           = useState("");
  const [bottomText, setBottomText]     = useState("");
  const [liveStream, setLiveStream]     = useState<MediaStream | null>(null);
  const [faceOverlay, setFaceOverlay]   = useState<FaceOverlayDef>(FACE_OVERLAYS[0]);
  const [videoElState, setVideoElState] = useState<HTMLVideoElement | null>(null);

  const enumCameras = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter(d=>d.kind==="videoinput").map((d,i)=>({ deviceId:d.deviceId, label:d.label||`Kamera ${i+1}` }));
      setCameras(cams); return cams;
    } catch { return []; }
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setError(null);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      const vid: MediaTrackConstraints = deviceId
        ? { deviceId:{ exact:deviceId }, width:{ ideal:1280 }, height:{ ideal:720 } }
        : { facingMode:"user", width:{ ideal:1280 }, height:{ ideal:720 } };
      const stream = await navigator.mediaDevices.getUserMedia({ video:vid, audio:false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; setVideoElState(videoRef.current); }
      setLiveStream(stream); setCameraOn(true);
      const cams = await enumCameras();
      if (!deviceId && cams.length > 0) setActiveCam(cams[0].deviceId);
    } catch { setError("Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan."); }
  }, [enumCameras]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current = null; setLiveStream(null); setCameraOn(false); setVideoElState(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const srcW = video.videoWidth||640, srcH = video.videoHeight||480;
    const outW = 1280, outH = 960;
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
    const ratio43 = 4/3, srcRatio = srcW/srcH;
    let cropW=srcW,cropH=srcH,cropX=0,cropY=0;
    if (srcRatio>ratio43) { cropH=srcH; cropW=Math.round(srcH*ratio43); cropX=Math.round((srcW-cropW)/2); }
    else { cropW=srcW; cropH=Math.round(srcW/ratio43); cropY=Math.round((srcH-cropH)/2); }
    const flt = [filter.css,`brightness(${brightness}%)`,`contrast(${contrast}%)`].filter(Boolean).join(" ");
    ctx.filter = flt||"none"; ctx.save();
    if (mirror) { ctx.scale(-1,1); ctx.drawImage(video,cropX,cropY,cropW,cropH,-outW,0,outW,outH); }
    else ctx.drawImage(video,cropX,cropY,cropW,cropH,0,0,outW,outH);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.92);
  }, [filter, brightness, contrast, mirror]);

  const startShooting = useCallback(async () => {
    if (!cameraOn) await startCamera(activeCam||undefined);
    cancelRef.current = false;
    const captured: string[] = [];
    setPhotos([]); setStickers([]);
    setPhase("shooting"); setCapturing(true);
    for (let i = 0; i < layout.count; i++) {
      if (cancelRef.current) break;
      setCaptureIdx(i);
      for (let c = timer; c >= 1; c--) { if (cancelRef.current) break; setCountdown(c); await sleep(1000); }
      if (cancelRef.current) break;
      setCountdown(null); setFlash(true); await sleep(130);
      const img = captureFrame(); if (img) captured.push(img);
      setPhotos([...captured]); setFlash(false);
      if (i < layout.count-1) await sleep(800);
    }
    setCapturing(false); setCountdown(null);
    if (cancelRef.current || captured.length === 0) setPhase("setup");
    else setPhase("preview");
  }, [cameraOn, layout, captureFrame, startCamera, activeCam, timer]);

  const cancelShooting = useCallback(() => { cancelRef.current = true; }, []);
  const reset = useCallback(() => {
    cancelRef.current = true;
    setPhase("setup"); setPhotos([]); setStickers([]);
    setCountdown(null); setFlash(false); setCapturing(false);
  }, []);

  const addSticker = (e: string) => setStickers(s=>[...s,{ id:Date.now(),emoji:e,x:20+Math.random()*60,y:10+Math.random()*75,size:26+Math.random()*14,rotate:Math.random()*40-20 }]);

  const onStickerDown = (e: React.MouseEvent, id: number) => {
    e.preventDefault(); setDragId(id);
    const container = resultRef.current; if (!container) return;
    const rect = container.getBoundingClientRect();
    const move = (me: MouseEvent) => {
      const x = Math.max(0,Math.min(100,((me.clientX-rect.left)/rect.width)*100));
      const y = Math.max(0,Math.min(100,((me.clientY-rect.top)/rect.height)*100));
      setStickers(s=>s.map(st=>st.id===id?{...st,x,y}:st));
    };
    const up = () => { setDragId(null); window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);
  };

  const downloadResult = useCallback(async () => {
    if (photos.length === 0) return;
    const cols=layout.cols, rows=Math.ceil(photos.length/cols);
    const cellW=480,cellH=360,gap=8;
    const padSide=frame.value==="none"?0:28, padTop=frame.value==="none"?0:frame.value==="darkfilm"?36:56, padBot=frame.value==="none"?0:52;
    const innerW=cols*cellW+(cols-1)*gap, innerH=rows*cellH+(rows-1)*gap;
    const totalW=innerW+padSide*2, totalH=innerH+padTop+padBot;
    const off=document.createElement("canvas"); off.width=totalW; off.height=totalH;
    const ctx=off.getContext("2d")!;
    if (frame.bgGradient) { const g=ctx.createLinearGradient(0,0,totalW,totalH); g.addColorStop(0,frame.bgGradient[0]); g.addColorStop(1,frame.bgGradient[1]); ctx.fillStyle=g; }
    else ctx.fillStyle=frame.bgColor;
    ctx.fillRect(0,0,totalW,totalH);
    if (frame.value==="darkfilm") {
      ctx.fillStyle="#1a1a1a"; ctx.fillRect(0,0,totalW,padTop); ctx.fillRect(0,totalH-padBot,totalW,padBot);
      ctx.fillStyle="#2e2e2e"; const hR=7,hStep=26;
      for (let yy=hStep;yy<totalH-padBot;yy+=hStep) [4,totalW-hR*2-4].forEach(xx=>{ctx.beginPath();ctx.roundRect(xx,yy-hR,hR*2,hR*2,hR);ctx.fill();});
    }
    if (frame.borderColor&&frame.borderPx) { ctx.strokeStyle=frame.borderColor; ctx.lineWidth=frame.borderPx; const h=frame.borderPx/2; ctx.strokeRect(h,h,totalW-frame.borderPx,totalH-frame.borderPx); }
    await Promise.all(photos.map((src,idx)=>new Promise<void>(res=>{
      const img=new Image(); img.onload=()=>{
        const col=idx%cols,row=Math.floor(idx/cols);
        const x=padSide+col*(cellW+gap),y=padTop+row*(cellH+gap);
        ctx.save(); ctx.beginPath(); ctx.rect(x,y,cellW,cellH); ctx.clip();
        const iW=img.naturalWidth,iH=img.naturalHeight,cr=cellW/cellH,ir=iW/iH;
        let sx=0,sy=0,sw=iW,sh=iH;
        if(ir>cr){sw=Math.round(iH*cr);sx=Math.round((iW-sw)/2);}else{sh=Math.round(iW/cr);sy=Math.round((iH-sh)/2);}
        ctx.drawImage(img,sx,sy,sw,sh,x,y,cellW,cellH); ctx.restore(); res();
      }; img.onerror=()=>res(); img.src=src;
    })));
    if (frame.value!=="none") {
      ctx.fillStyle=frame.labelColor; ctx.font="bold 14px 'Courier New',monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(topText||frame.labelTop||"✦ PHOTOBOOTH ✦",totalW/2,padTop/2);
      ctx.fillText(bottomText||frame.label||"✦ PHOTOBOOTH ✦",totalW/2,totalH-padBot/2);
    }
    const a=document.createElement("a"); a.download=`photobooth_${Date.now()}.jpg`; a.href=off.toDataURL("image/jpeg",0.93); a.click();
  }, [photos,layout,frame,topText,bottomText]);

  const videoFilter = [filter.css,`brightness(${brightness}%)`,`contrast(${contrast}%)`].filter(Boolean).join(" ")||"none";
  const isStrip = !!layout.isStrip;
  const isLightFrame = frame.value==="white"||frame.value==="pastel";
  const framePadTop=frame.value==="none"?"0":"7%", framePadSide=frame.value==="none"?"0":"5%", framePadBot=frame.value==="none"?"0":"7%";
  const faceActive = cameraOn && (phase==="setup"||phase==="shooting") && faceOverlay.id!=="none";

  return (
    <div style={{ minHeight:"100vh",background:"#0b0b12",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 12px 48px",fontFamily:"'Courier New',monospace",color:"#fff" }}>
      <canvas ref={canvasRef} style={{ display:"none" }}/>

      <header style={{ textAlign:"center",marginBottom:28 }}>
        <div style={{ display:"inline-flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:40,padding:"8px 24px",marginBottom:10 }}>
          <span style={{ fontSize:22 }}>📸</span>
          <h1 style={{ margin:0,fontSize:22,letterSpacing:6,fontWeight:700,background:"linear-gradient(90deg,#ff2d9e,#a855f7,#38bdf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>PHOTOBOOTH</h1>
        </div>
        <p style={{ color:"#444",fontSize:11,letterSpacing:3,margin:0 }}>STRIKE A POSE &amp; MAKE MEMORIES</p>
      </header>

      <div style={{ width:"100%",maxWidth:1020,display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",alignItems:"flex-start" }}>

        {/* LEFT */}
        <div style={{ flex:"1 1 460px",display:"flex",flexDirection:"column",gap:10 }}>
          <div style={{ position:"relative",borderRadius:14,overflow:"hidden",background:"#050508",border:"1px solid rgba(255,255,255,0.07)",aspectRatio:(phase==="result"||phase==="preview")&&isStrip?"2/3":"4/3",display:"flex",alignItems:"stretch" }}>

            {phase!=="result"&&phase!=="preview"&&(
              <>
                <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",filter:videoFilter,transform:mirror?"scaleX(-1)":"none",display:cameraOn?"block":"none" }} onLoadedMetadata={()=>setVideoElState(videoRef.current)}/>
                <FaceOverlayCanvas videoEl={videoElState} overlay={faceOverlay} mirror={mirror} active={faceActive}/>
                {showGrid&&cameraOn&&<div style={{ position:"absolute",inset:0,pointerEvents:"none",zIndex:3 }}>{[33,66].map(p=><div key={`v${p}`} style={{ position:"absolute",left:`${p}%`,top:0,bottom:0,borderLeft:"1px solid rgba(255,255,255,0.2)" }}/>)}{[33,66].map(p=><div key={`h${p}`} style={{ position:"absolute",top:`${p}%`,left:0,right:0,borderTop:"1px solid rgba(255,255,255,0.2)" }}/>)}</div>}
              </>
            )}

            {(phase==="setup"||phase==="shooting")&&!cameraOn&&<div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"#222" }}><div style={{ fontSize:52 }}>📷</div><p style={{ margin:"8px 0 0",fontSize:11,letterSpacing:2 }}>KAMERA BELUM AKTIF</p></div>}

            {phase==="shooting"&&photos.length>0&&isStrip&&<div style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:5,zIndex:5 }}>{photos.map((p,i)=><div key={i} style={{ width:60,height:45,borderRadius:4,overflow:"hidden",border:"2px solid #ff2d9e",boxShadow:"0 0 10px #ff2d9e55" }}><img src={p} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center" }}/></div>)}</div>}

            {(phase==="result"||phase==="preview")&&photos.length>0&&(
              <div ref={resultRef} style={{ position:"relative",width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"stretch",overflow:"hidden",boxSizing:"border-box",...frame.divStyle,padding:frame.value==="none"?"0":frame.value==="darkfilm"?"9% 3% 9%":`${framePadTop} ${framePadSide} ${framePadBot}` }}>
                {frame.value!=="none"&&<div style={{ textAlign:"center",fontSize:"clamp(8px,1.8vw,12px)",letterSpacing:3,fontWeight:700,color:isLightFrame?"#777":frame.labelColor,flexShrink:0,paddingBottom:"2%",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{topText||frame.labelTop||"✦ PHOTOBOOTH ✦"}</div>}
                <div style={{ display:"grid",gridTemplateColumns:`repeat(${layout.cols},1fr)`,gap:"1.5%",flex:1,minHeight:0,width:"100%" }}>
                  {photos.map((p,i)=><div key={i} style={{ position:"relative",overflow:"hidden",borderRadius:2,background:"#000",aspectRatio:"4/3",width:"100%" }}><img src={p} alt={`Foto ${i+1}`} style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",display:"block" }}/></div>)}
                </div>
                {frame.value!=="none"&&<div style={{ textAlign:"center",fontSize:"clamp(8px,1.8vw,12px)",letterSpacing:3,fontWeight:700,paddingTop:"2%",color:isLightFrame?"#666":frame.labelColor,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{bottomText||frame.label||"✦ PHOTOBOOTH ✦"}</div>}
                {frame.value==="darkfilm"&&<><div style={{ position:"absolute",left:4,top:"9%",bottom:"9%",display:"flex",flexDirection:"column",justifyContent:"space-around",pointerEvents:"none" }}>{Array.from({length:6}).map((_,i)=><div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"#2e2e2e" }}/>)}</div><div style={{ position:"absolute",right:4,top:"9%",bottom:"9%",display:"flex",flexDirection:"column",justifyContent:"space-around",pointerEvents:"none" }}>{Array.from({length:6}).map((_,i)=><div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"#2e2e2e" }}/>)}</div></>}
                {stickers.map(st=><div key={st.id} onMouseDown={e=>onStickerDown(e,st.id)} onDoubleClick={()=>dragId===null&&setStickers(s=>s.filter(x=>x.id!==st.id))} style={{ position:"absolute",left:`${st.x}%`,top:`${st.y}%`,fontSize:st.size,lineHeight:1,transform:`translate(-50%,-50%) rotate(${st.rotate}deg)`,cursor:dragId===st.id?"grabbing":"grab",userSelect:"none",zIndex:20,filter:"drop-shadow(0 1px 4px rgba(0,0,0,0.6))" }} title="Drag pindah • Dbl-click hapus">{st.emoji}</div>)}
              </div>
            )}

            {flash&&<div style={{ position:"absolute",inset:0,background:"#fff",animation:"pbFlash 0.25s ease-out forwards",zIndex:30 }}/>}
            {countdown!==null&&<div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",background:"rgba(0,0,0,0.35)",backdropFilter:"blur(3px)",zIndex:25 }}><div style={{ fontSize:100,fontWeight:900,lineHeight:1,animation:"pbPulse 0.5s ease",background:"linear-gradient(135deg,#ff2d9e,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>{countdown}</div><div style={{ color:"rgba(255,255,255,0.6)",fontSize:11,letterSpacing:3,marginTop:8 }}>FOTO {captureIdx+1} / {layout.count}</div><button onClick={cancelShooting} style={{ marginTop:20,padding:"7px 22px",borderRadius:20,border:"1px solid rgba(255,80,80,0.4)",background:"rgba(180,0,0,0.35)",color:"#ffaaaa",cursor:"pointer",fontSize:11,letterSpacing:1,fontFamily:"inherit" }}>✕ CANCEL</button></div>}
            {cameraOn&&phase==="setup"&&<div style={{ position:"absolute",top:10,right:10,display:"flex",flexDirection:"column",gap:6,zIndex:5 }}><OverlayBtn onClick={()=>setShowGrid(g=>!g)} title="Grid" active={showGrid}>⊞</OverlayBtn><OverlayBtn onClick={()=>setMirror(m=>!m)} title="Mirror">{mirror?"◧":"◨"}</OverlayBtn></div>}
            {faceActive&&faceOverlay.id!=="none"&&<div style={{ position:"absolute",bottom:10,left:10,zIndex:6,background:"rgba(0,0,0,0.65)",borderRadius:20,padding:"4px 12px",fontSize:11,color:"#a855f7",border:"1px solid rgba(168,85,247,0.4)" }}>{faceOverlay.icon} {faceOverlay.label}</div>}
          </div>

          {error&&<div style={{ color:"#ff7070",fontSize:12,textAlign:"center",padding:"8px 14px",background:"rgba(255,80,80,0.07)",borderRadius:8,border:"1px solid rgba(255,80,80,0.2)" }}>⚠ {error}</div>}
          {cameras.length>1&&phase==="setup"&&<div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>{cameras.map(cam=><button key={cam.deviceId} onClick={()=>{setActiveCam(cam.deviceId);startCamera(cam.deviceId);}} style={{ fontSize:11,padding:"5px 12px",borderRadius:20,border:`1px solid ${activeCam===cam.deviceId?"#ff2d9e":"rgba(255,255,255,0.12)"}`,background:activeCam===cam.deviceId?"rgba(255,45,158,0.12)":"transparent",color:activeCam===cam.deviceId?"#ff2d9e":"#666",cursor:"pointer",fontFamily:"inherit" }}>📷 {cam.label.length>26?cam.label.slice(0,26)+"…":cam.label}</button>)}</div>}

          <div style={{ display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap" }}>
            {phase==="setup"&&!cameraOn&&<button onClick={()=>startCamera()} style={primaryBtn}>📷 Aktifkan Kamera</button>}
            {phase==="setup"&&cameraOn&&<><button onClick={startShooting} style={primaryBtn}>🎬 Mulai Foto!</button><button onClick={stopCamera} style={secondaryBtn}>Matikan</button></>}
            {phase==="shooting"&&!capturing&&<button onClick={reset} style={dangerBtn}>Batal</button>}
            {phase==="shooting"&&capturing&&countdown===null&&<button onClick={cancelShooting} style={dangerBtn}>✕ Stop</button>}
            {phase==="preview"&&<><button onClick={()=>setPhase("result")} style={primaryBtn}>✓ Finalisasi</button><button onClick={()=>{reset();startCamera(activeCam||undefined);}} style={secondaryBtn}>🔄 Ulangi</button></>}
            {phase==="result"&&<><button onClick={downloadResult} style={{ ...primaryBtn,background:"linear-gradient(135deg,#D4AF37,#a07c10)" }}>⬇ Download</button><button onClick={()=>setPhase("preview")} style={secondaryBtn}>← Edit</button><button onClick={()=>{reset();startCamera(activeCam||undefined);}} style={secondaryBtn}>📸 Foto Lagi</button></>}
          </div>

          <div style={{ display:"flex",gap:8,justifyContent:"center",alignItems:"center" }}>
            {(["setup","shooting","preview","result"] as Phase[]).map((p,i)=>(
              <div key={p} style={{ display:"flex",alignItems:"center",gap:8 }}>
                {i>0&&<div style={{ width:20,height:1,background:phase===p||(["shooting","preview","result"].indexOf(phase)>=i)?"#ff2d9e33":"rgba(255,255,255,0.06)" }}/>}
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <div style={{ width:7,height:7,borderRadius:"50%",background:phase===p?"#ff2d9e":"rgba(255,255,255,0.08)",boxShadow:phase===p?"0 0 6px #ff2d9e":"none" }}/>
                  <span style={{ fontSize:9,letterSpacing:1,color:phase===p?"#ff2d9e":"#333",textTransform:"uppercase" }}>{p}</span>
                </div>
              </div>
            ))}
          </div>

          {(phase==="preview"||phase==="result")&&photos.length>1&&<div style={{ display:"flex",gap:6,justifyContent:"center" }}>{photos.map((p,i)=><div key={i} style={{ width:68,height:51,borderRadius:4,overflow:"hidden",border:`2px solid ${phase==="result"?"#D4AF37":"rgba(255,45,158,0.55)"}`,boxShadow:"0 2px 8px rgba(0,0,0,0.5)",flexShrink:0 }}><img src={p} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center" }}/></div>)}</div>}
          {phase==="shooting"&&<div style={{ display:"flex",gap:5,justifyContent:"center" }}>{Array.from({length:layout.count}).map((_,i)=><div key={i} style={{ height:3,flex:1,maxWidth:52,borderRadius:2,background:i<photos.length?"#ff2d9e":"rgba(255,255,255,0.1)",boxShadow:i<photos.length?"0 0 6px #ff2d9e":"none",transition:"background 0.3s" }}/>)}</div>}
        </div>

        {/* RIGHT */}
        <div style={{ flex:"0 0 244px",display:"flex",flexDirection:"column",gap:12 }}>
          <LiveFramePreview frame={frame} layout={layout} photos={photos} topText={topText} bottomText={bottomText} liveVideoSrc={liveStream}/>

          <div style={{ display:"flex",borderRadius:"10px 10px 0 0",overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",borderBottom:"none" }}>
            {(["layout","filter","frame","face","adjust","sticker"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ flex:1,padding:"7px 0",fontSize:7.5,letterSpacing:0.3,textTransform:"uppercase",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:tab===t?700:400,background:tab===t?"rgba(255,45,158,0.14)":"rgba(255,255,255,0.02)",color:tab===t?"#ff2d9e":"#444",borderRight:"1px solid rgba(255,255,255,0.05)",transition:"all 0.15s" }}>
                {t==="layout"?"📐":t==="filter"?"🎨":t==="frame"?"🖼":t==="face"?"🎭":t==="adjust"?"⚙":"✨"}<br/>{t}
              </button>
            ))}
          </div>

          <div style={{ background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"0 0 10px 10px",padding:14,minHeight:260,overflowY:"auto" }}>

            {tab==="layout"&&(
              <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                <SectionLabel>Layout Foto</SectionLabel>
                {LAYOUTS.map(l=><button key={l.name} onClick={()=>setLayout(l)} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,border:`1px solid ${layout.name===l.name?"#ff2d9e":"rgba(255,255,255,0.06)"}`,background:layout.name===l.name?"rgba(255,45,158,0.09)":"transparent",cursor:"pointer",color:layout.name===l.name?"#ff2d9e":"#888",fontFamily:"inherit",textAlign:"left" }}><span style={{ fontSize:15,minWidth:24 }}>{l.icon}</span><span style={{ flex:1,fontSize:12,fontWeight:layout.name===l.name?700:400 }}>{l.name}</span><span style={{ fontSize:10,color:layout.name===l.name?"#ff8cc8":"#333" }}>{l.count} foto</span></button>)}
                <SectionLabel style={{ marginTop:10 }}>Timer</SectionLabel>
                <div style={{ display:"flex",gap:6 }}>{TIMER_OPTIONS.map(t=><button key={t} onClick={()=>setTimer(t)} style={{ flex:1,padding:"7px 0",borderRadius:7,fontSize:13,fontWeight:700,border:`1px solid ${timer===t?"#ff2d9e":"rgba(255,255,255,0.1)"}`,background:timer===t?"rgba(255,45,158,0.12)":"transparent",color:timer===t?"#ff2d9e":"#555",cursor:"pointer",fontFamily:"inherit" }}>{t}s</button>)}</div>
              </div>
            )}

            {tab==="filter"&&(
              <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
                <SectionLabel>Filter Kamera</SectionLabel>
                {FILTERS.map(f=><button key={f.value} onClick={()=>setFilter(f)} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,border:`1px solid ${filter.value===f.value?"#ff2d9e":"rgba(255,255,255,0.05)"}`,background:filter.value===f.value?"rgba(255,45,158,0.09)":"transparent",cursor:"pointer",fontFamily:"inherit",textAlign:"left",color:filter.value===f.value?"#ff2d9e":"#888" }}><span style={{ fontSize:13,fontWeight:700,minWidth:16 }}>{f.icon}</span><span style={{ fontSize:12 }}>{f.name}</span></button>)}
              </div>
            )}

            {tab==="frame"&&(
              <div>
                <SectionLabel>Bingkai Foto</SectionLabel>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
                  {FRAMES.map(fr=><button key={fr.value} onClick={()=>setFrame(fr)} style={{ padding:"10px 6px",borderRadius:8,border:`2px solid ${frame.value===fr.value?"#ff2d9e":"rgba(255,255,255,0.06)"}`,background:"rgba(255,255,255,0.015)",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:7 }}><FrameSwatch fr={fr}/><span style={{ fontSize:8.5,letterSpacing:0.5,color:frame.value===fr.value?"#ff2d9e":"#444",fontWeight:frame.value===fr.value?700:400 }}>{fr.name.toUpperCase()}</span></button>)}
                </div>
                {frame.value!=="none"&&(
                  <>
                    <SectionLabel style={{ marginTop:4 }}>Teks Kustom</SectionLabel>
                    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                      <div><p style={{ fontSize:9,color:"#444",margin:"0 0 4px",letterSpacing:1 }}>TEKS ATAS</p><input type="text" value={topText} onChange={e=>setTopText(e.target.value)} placeholder={frame.labelTop||"✦ PHOTOBOOTH ✦"} maxLength={28} style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 10px",color:"#ccc",fontSize:11,fontFamily:"inherit",outline:"none" }}/></div>
                      <div><p style={{ fontSize:9,color:"#444",margin:"0 0 4px",letterSpacing:1 }}>TEKS BAWAH</p><input type="text" value={bottomText} onChange={e=>setBottomText(e.target.value)} placeholder={frame.label||"MEMORIES"} maxLength={28} style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 10px",color:"#ccc",fontSize:11,fontFamily:"inherit",outline:"none" }}/></div>
                      <button onClick={()=>{setTopText("");setBottomText("");}} style={{ ...secondaryBtn,fontSize:10,padding:"6px 10px" }}>Reset ke Default</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── FACE TAB ── */}
            {tab==="face"&&(
              <div>
                <SectionLabel>Filter Wajah AR</SectionLabel>
                <p style={{ fontSize:9,color:"#444",margin:"0 0 10px",lineHeight:1.7 }}>AI mendeteksi wajah &amp; menempel overlay secara realtime. Pastikan pencahayaan cukup.</p>
                <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
                  {FACE_OVERLAYS.map(ov=>(
                    <button key={ov.id} onClick={()=>setFaceOverlay(ov)} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,border:`1px solid ${faceOverlay.id===ov.id?"#a855f7":"rgba(255,255,255,0.06)"}`,background:faceOverlay.id===ov.id?"rgba(168,85,247,0.12)":"transparent",cursor:"pointer",color:faceOverlay.id===ov.id?"#a855f7":"#888",fontFamily:"inherit",textAlign:"left" }}>
                      <span style={{ fontSize:16,minWidth:22 }}>{ov.icon}</span>
                      <span style={{ fontSize:12,fontWeight:faceOverlay.id===ov.id?700:400 }}>{ov.label}</span>
                      {faceOverlay.id===ov.id&&<span style={{ marginLeft:"auto",fontSize:9,color:"#a855f7" }}>✓ AKTIF</span>}
                    </button>
                  ))}
                </div>
                {faceOverlay.id!=="none"&&(
                  <div style={{ marginTop:12,padding:"10px",borderRadius:8,background:"rgba(168,85,247,0.06)",border:"1px solid rgba(168,85,247,0.15)",fontSize:10,color:"#555",lineHeight:1.6 }}>
                    💡 Model AI (~6MB) dimuat pertama kali saat overlay dipilih. Butuh koneksi internet untuk memuat model deteksi wajah.
                  </div>
                )}
              </div>
            )}

            {tab==="adjust"&&(
              <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                <SectionLabel>Penyesuaian</SectionLabel>
                <RangeSlider label="Kecerahan" value={brightness} min={50} max={180} onChange={setBrightness} unit="%"/>
                <RangeSlider label="Kontras"   value={contrast}   min={50} max={200} onChange={setContrast}   unit="%"/>
                <Toggle label="Mirror"       value={mirror}   onChange={setMirror}/>
                <Toggle label="Grid Panduan" value={showGrid} onChange={setShowGrid}/>
                <button onClick={()=>{setBrightness(100);setContrast(100);setFilter(FILTERS[0]);}} style={{ ...secondaryBtn,fontSize:11 }}>Reset</button>
              </div>
            )}

            {tab==="sticker"&&(
              <div>
                <SectionLabel>Tambah Stiker</SectionLabel>
                {phase!=="result"&&<p style={{ color:"#333",fontSize:11,marginBottom:10,lineHeight:1.5 }}>Stiker tersedia setelah foto difinalisasi.</p>}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5 }}>
                  {STICKERS.map((s,i)=><button key={i} onClick={()=>phase==="result"&&addSticker(s)} style={{ fontSize:20,padding:"7px 4px",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)",cursor:phase==="result"?"pointer":"not-allowed",opacity:phase==="result"?1:0.22 }}>{s}</button>)}
                </div>
                {stickers.length>0&&phase==="result"&&<div style={{ marginTop:10 }}><p style={{ fontSize:9,color:"#444",marginBottom:6,letterSpacing:1 }}>DRAG PINDAH • DBL-CLICK HAPUS</p><button onClick={()=>setStickers([])} style={{ ...secondaryBtn,fontSize:11,width:"100%" }}>Hapus Semua</button></div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pbFlash { 0%{opacity:0.95} 100%{opacity:0} }
        @keyframes pbPulse { 0%{transform:scale(1.6);opacity:0.4} 100%{transform:scale(1);opacity:1} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#222;border-radius:2px; }
        input::placeholder { color:#333; }
        input:focus { border-color:rgba(255,45,158,0.4)!important; }
      `}</style>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return <p style={{ fontSize:9.5,letterSpacing:1.5,color:"#444",textTransform:"uppercase",margin:"0 0 6px",fontWeight:700,...style }}>{children}</p>;
}
function OverlayBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick:()=>void; title?:string; active?:boolean }) {
  return <button onClick={onClick} title={title} style={{ background:active?"rgba(255,45,158,0.4)":"rgba(0,0,0,0.55)",border:`1px solid ${active?"#ff2d9e":"rgba(255,255,255,0.1)"}`,borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:15,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>{children}</button>;
}
function FrameSwatch({ fr }: { fr: FrameDef }) {
  if (fr.value==="darkfilm") return <div style={{ width:52,height:36,background:"#111",borderRadius:3,overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"4px 2px" }}>{[0,1].map(i=><div key={i} style={{ display:"flex",gap:3 }}>{[0,1,2,3].map(j=><div key={j} style={{ flex:1,height:5,borderRadius:1,background:"#2e2e2e" }}/>)}</div>)}<div style={{ flex:1,margin:"3px 0",background:"#1a1a1a",borderRadius:1 }}/>{[0,1].map(i=><div key={i} style={{ display:"flex",gap:3 }}>{[0,1,2,3].map(j=><div key={j} style={{ flex:1,height:5,borderRadius:1,background:"#2e2e2e" }}/>)}</div>)}</div>;
  const style: Record<string,string>={};
  fr.previewSwatch.split(";").forEach(rule=>{const idx=rule.indexOf(":");if(idx===-1)return;const k=rule.slice(0,idx).trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase());const v=rule.slice(idx+1).trim();if(k&&v)style[k]=v;});
  return <div style={{ width:52,height:36,borderRadius:4,...style as CSSProperties }}>{fr.borderColor&&<div style={{ width:"100%",height:"100%",borderRadius:"inherit",border:`3px solid ${fr.borderColor}`,boxSizing:"border-box" }}/>}</div>;
}
function RangeSlider({ label, value, min, max, onChange, unit }: { label:string;value:number;min:number;max:number;onChange:(v:number)=>void;unit?:string }) {
  return <div><div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:10,color:"#555",letterSpacing:1 }}>{label.toUpperCase()}</span><span style={{ fontSize:10,color:"#888" }}>{value}{unit}</span></div><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))} style={{ width:"100%",accentColor:"#ff2d9e" }}/></div>;
}
function Toggle({ label, value, onChange }: { label:string;value:boolean;onChange:(v:boolean)=>void }) {
  return <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><span style={{ fontSize:10,color:"#555",letterSpacing:1 }}>{label.toUpperCase()}</span><button onClick={()=>onChange(!value)} style={{ width:42,height:22,borderRadius:11,border:"none",cursor:"pointer",background:value?"#ff2d9e":"#2a2a2a",position:"relative",transition:"background 0.2s",flexShrink:0 }}><div style={{ width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:value?23:3,transition:"left 0.2s" }}/></button></div>;
}
const primaryBtn:CSSProperties={ background:"linear-gradient(135deg,#ff2d9e,#a855f7)",color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit" };
const secondaryBtn:CSSProperties={ background:"rgba(255,255,255,0.05)",color:"#888",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"11px 16px",fontSize:13,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit" };
const dangerBtn:CSSProperties={ background:"rgba(255,60,60,0.1)",color:"#ff7070",border:"1px solid rgba(255,60,60,0.3)",borderRadius:10,padding:"11px 20px",fontSize:13,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit" };