// Curated Color Tokens and Styling for Recharts

export const CHART_COLORS = ["#3b82f6", "#06b6d4", "#7c3aed", "#0d9488", "#f59e0b", "#10b981"];

export const CHART_STYLE = {
  grid: { 
    stroke: "rgba(255,255,255,0.04)",
    strokeDasharray: "3 3"
  },
  axis: { 
    tick: { 
      fill: "#94a3b8", 
      fontSize: 11, 
      fontFamily: "var(--font-sans)" 
    }, 
    axisLine: false, 
    tickLine: false 
  },
  tooltip: {
    contentStyle: {
      background: "rgba(10, 22, 40, 0.92)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.10)",
      borderRadius: "12px",
      color: "#f0f6ff",
      fontSize: "13px",
      fontFamily: "var(--font-sans)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    },
    labelStyle: { color: "#60a5fa", fontWeight: 600 },
    cursor: { fill: "rgba(37, 99, 235, 0.05)" },
  },
  legend: { 
    wrapperStyle: { 
      color: "#94a3b8", 
      fontSize: "12px",
      fontFamily: "var(--font-sans)"
    } 
  },
};
