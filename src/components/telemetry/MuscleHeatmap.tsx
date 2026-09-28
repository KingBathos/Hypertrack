"use client";

import React from "react";

interface MuscleHeatmapProps {
  activeMuscles: string[]; // e.g., ['chest', 'shoulders']
  className?: string;
}

export default function MuscleHeatmap({ activeMuscles, className = "" }: MuscleHeatmapProps) {
  const getFill = (muscleId: string) => 
    activeMuscles.includes(muscleId) ? "#dc2626" : "#27272a";

  const getAnimation = (muscleId: string) => 
    activeMuscles.includes(muscleId) ? "animate-pulse drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" : "";

  return (
    <div className={`relative flex justify-center items-center ${className}`}>
      <svg 
        viewBox="0 0 400 800" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-100 object-contain"
        style={{ filter: "drop-shadow(0 0 20px rgba(0,0,0,0.5))" }}
      >
        {/* Base Silhouette Outline */}
        <path d="M200 40 C 220 40, 230 60, 230 80 C 230 110, 210 120, 200 120 C 190 120, 170 110, 170 80 C 170 60, 180 40, 200 40 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="3" />
        <path d="M 170 120 C 130 130, 90 150, 80 200 L 60 350 L 90 360 L 130 200 L 140 380 L 120 750 L 160 760 L 190 420 L 210 420 L 240 760 L 280 750 L 260 380 L 270 200 L 310 360 L 340 350 L 320 200 C 310 150, 270 130, 230 120 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="3" strokeLinejoin="round" />

        {/* Shoulders (Deltoids) */}
        <path 
          id="shoulders_left"
          d="M 160 130 C 130 135, 100 150, 80 190 C 90 220, 110 230, 125 210 C 130 180, 140 160, 160 130 Z"
          fill={getFill("shoulders")} 
          className={`transition-all duration-500 ${getAnimation("shoulders")}`}
          stroke="#18181b" strokeWidth="2"
        />
        <path 
          id="shoulders_right"
          d="M 240 130 C 270 135, 300 150, 320 190 C 310 220, 290 230, 275 210 C 270 180, 260 160, 240 130 Z"
          fill={getFill("shoulders")} 
          className={`transition-all duration-500 ${getAnimation("shoulders")}`}
          stroke="#18181b" strokeWidth="2"
        />

        {/* Chest (Pectorals) */}
        <path 
          id="chest_left"
          d="M 195 130 L 150 140 C 140 160, 145 190, 160 210 C 180 215, 190 210, 195 190 Z"
          fill={getFill("chest")} 
          className={`transition-all duration-500 ${getAnimation("chest")}`}
          stroke="#18181b" strokeWidth="2"
        />
        <path 
          id="chest_right"
          d="M 205 130 L 250 140 C 260 160, 255 190, 240 210 C 220 215, 210 210, 205 190 Z"
          fill={getFill("chest")} 
          className={`transition-all duration-500 ${getAnimation("chest")}`}
          stroke="#18181b" strokeWidth="2"
        />

        {/* Abs (Abdomen) */}
        <path 
          id="abs"
          d="M 165 220 C 160 250, 160 300, 170 340 C 190 350, 210 350, 230 340 C 240 300, 240 250, 235 220 C 220 230, 180 230, 165 220 Z"
          fill={getFill("abs")} 
          className={`transition-all duration-500 ${getAnimation("abs")}`}
          stroke="#18181b" strokeWidth="2"
        />

        {/* Biceps */}
        <path 
          id="biceps_left"
          d="M 80 200 C 60 240, 65 280, 75 320 C 95 310, 110 280, 120 240 C 110 210, 95 200, 80 200 Z"
          fill={getFill("biceps")} 
          className={`transition-all duration-500 ${getAnimation("biceps")}`}
          stroke="#18181b" strokeWidth="2"
        />
        <path 
          id="biceps_right"
          d="M 320 200 C 340 240, 335 280, 325 320 C 305 310, 290 280, 280 240 C 290 210, 305 200, 320 200 Z"
          fill={getFill("biceps")} 
          className={`transition-all duration-500 ${getAnimation("biceps")}`}
          stroke="#18181b" strokeWidth="2"
        />

        {/* Quads */}
        <path 
          id="quads_left"
          d="M 165 370 C 130 400, 120 480, 130 550 C 150 560, 170 550, 180 500 C 195 440, 195 390, 180 360 Z"
          fill={getFill("quads")} 
          className={`transition-all duration-500 ${getAnimation("quads")}`}
          stroke="#18181b" strokeWidth="2"
        />
        <path 
          id="quads_right"
          d="M 235 370 C 270 400, 280 480, 270 550 C 250 560, 230 550, 220 500 C 205 440, 205 390, 220 360 Z"
          fill={getFill("quads")} 
          className={`transition-all duration-500 ${getAnimation("quads")}`}
          stroke="#18181b" strokeWidth="2"
        />

        {/* Calves (Gemelos) */}
        <path 
          id="calves_left"
          d="M 130 580 C 110 630, 120 700, 130 730 C 150 730, 160 700, 165 650 C 170 620, 160 590, 145 570 Z"
          fill={getFill("calves")} 
          className={`transition-all duration-500 ${getAnimation("calves")}`}
          stroke="#18181b" strokeWidth="2"
        />
        <path 
          id="calves_right"
          d="M 270 580 C 290 630, 280 700, 270 730 C 250 730, 240 700, 235 650 C 230 620, 240 590, 255 570 Z"
          fill={getFill("calves")} 
          className={`transition-all duration-500 ${getAnimation("calves")}`}
          stroke="#18181b" strokeWidth="2"
        />
      </svg>
    </div>
  );
}
