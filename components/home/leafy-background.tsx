"use client";

import { useEffect, useRef } from "react";

export function LeafyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId = 0;

    const resizeCanvas = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    type LeafParticle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rotation: number;
      rotationSpeed: number;
      size: number;
      opacity: number;
    };

    const createLeaf = (): LeafParticle => ({
      x: Math.random() * width,
      y: Math.random() * height - height,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 1 + 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      size: Math.random() * 20 + 10,
      opacity: Math.random() * 0.3 + 0.1,
    });

    const leaves: LeafParticle[] = [];
    const leafCount = 15;

    const updateLeaf = (leaf: LeafParticle) => {
      leaf.x += leaf.vx;
      leaf.y += leaf.vy;
      leaf.rotation += leaf.rotationSpeed;

      if (leaf.y > height) {
        leaf.y = -leaf.size;
        leaf.x = Math.random() * width;
      }
    };

    const drawLeaf = (leaf: LeafParticle) => {
      ctx.save();
      ctx.globalAlpha = leaf.opacity;
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rotation);

      ctx.fillStyle = "#65A30D";
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size / 2, leaf.size, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#4a7c0c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -leaf.size);
      ctx.lineTo(0, leaf.size);
      ctx.stroke();

      ctx.restore();
    };

    for (let i = 0; i < leafCount; i++) {
      leaves.push(createLeaf());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      leaves.forEach((leaf) => {
        updateLeaf(leaf);
        drawLeaf(leaf);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}
