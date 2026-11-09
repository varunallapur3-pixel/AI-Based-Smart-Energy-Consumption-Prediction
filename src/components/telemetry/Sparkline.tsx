import React from 'react';

interface SparklineProps {
  color?: string;
  points?: number[];
  height?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  color = '#4cd7f6',
  points,
  height = 28,
  className = '',
}) => {
  // If specific numerical points provided, compute SVG path
  if (points && points.length > 1) {
    const min = Math.min(...points);
    const max = Math.max(...points) || min + 1;
    const width = 100;
    const step = width / (points.length - 1);

    const coords = points.map((val, idx) => {
      const x = +(idx * step).toFixed(1);
      const normalized = (val - min) / (max - min);
      const y = +(height - normalized * (height - 4) - 2).toFixed(1);
      return `${x},${y}`;
    });

    const lastCoord = coords[coords.length - 1].split(',');
    const lastX = Number(lastCoord[0]);
    const lastY = Number(lastCoord[1]);

    const d = `M ${coords.join(' L ')}`;

    return (
      <svg
        className={`w-full overflow-visible ${className}`}
        style={{ height }}
        preserveAspectRatio="none"
        viewBox={`0 0 100 ${height}`}
      >
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="2.5" fill={color} className="animate-ping" />
        <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      </svg>
    );
  }

  // Default wave pattern matching Stitch reference
  return (
    <svg
      className={`w-full h-7 overflow-visible ${className}`}
      preserveAspectRatio="none"
      viewBox="0 0 100 24"
    >
      <path
        d="M0,18 Q15,8 30,14 T60,6 T85,16 T100,10"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="100" cy="10" r="2.5" fill={color} className="animate-ping" />
      <circle cx="100" cy="10" r="2.5" fill={color} />
    </svg>
  );
};
