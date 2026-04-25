"use client";

interface SuccessCheckProps {
  greenColor: string;
  size?: number;
}

export default function SuccessCheck({ greenColor, size = 80 }: SuccessCheckProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ margin: "0 auto 24px", animation: "scaleIn 0.3s ease-out" }}
    >
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes drawPath {
          from { stroke-dashoffset: 100%; }
          to { stroke-dashoffset: 0%; }
        }
      `}</style>
      
      {/* Circle background */}
      <circle
        cx="40"
        cy="40"
        r="36"
        fill={`${greenColor}20`}
        stroke={greenColor}
        strokeWidth="2"
        style={{ animation: "scaleIn 0.3s ease-out" }}
      />

      {/* Checkmark path with stroke animation */}
      <path
        d="M 28 40 L 35 48 L 52 32"
        stroke={greenColor}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="100%"
        style={{ animation: "drawPath 0.6s ease-in-out 0.1s forwards" }}
      />
    </svg>
  );
}
