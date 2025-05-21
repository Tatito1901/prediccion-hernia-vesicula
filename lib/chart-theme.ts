export const chartPalette = {
  primary: {
    100: "#E6F7FF",
    200: "#BAE7FF",
    300: "#91D5FF",
    400: "#69C0FF",
    500: "#40A9FF",
    600: "#1890FF",
    700: "#096DD9",
    800: "#0050B3",
    900: "#003A8C",
  },
  secondary: {
    100: "#E6FFFB",
    200: "#B5F5EC",
    300: "#87E8DE",
    400: "#5CDBD3",
    500: "#36CFC9",
    600: "#13C2C2",
    700: "#08979C",
    800: "#006D75",
    900: "#00474F",
  },
  accent: {
    teal: "#20B2AA",
    lavender: "#9683EC",
    mint: "#5AC8C8",
    coral: "#FF7F50",
    navy: "#0A2463",
  },
  clinical: {
    healthy: "#52C41A",
    attention: "#FAAD14",
    critical: "#F5222D",
    stable: "#1890FF",
    improving: "#13C2C2",
    chronic: "#722ED1",
  },
  neutral: {
    100: "#FFFFFF",
    200: "#F5F7FA",
    300: "#E4E9F2",
    400: "#C5CEE0",
    500: "#A6B1C9",
    600: "#8897B8",
    700: "#5E6C8F",
    800: "#384366",
    900: "#1A2138",
  },
  charts: {
    medical: [
      "#1890FF",
      "#13C2C2",
      "#52C41A",
      "#722ED1",
      "#2F54EB",
      "#1D39C4",
      "#08979C",
      "#006D75",
      "#5B8FF9",
      "#5AD8A6",
    ],
    diagnosis: [
      "#5B8FF9",
      "#5AD8A6",
      "#5D7092",
      "#F6BD16",
      "#6DC8EC",
      "#945FB9",
      "#FF9845",
      "#1E9493",
      "#FF99C3",
      "#5D61BF",
    ],
    patients: [
      "#5B8FF9",
      "#CDDDFD",
      "#61DDAA",
      "#CDF3E4",
      "#65789B",
      "#CED4DE",
      "#F6BD16",
      "#FCEBB9",
      "#7262FD",
      "#D3CEFD",
    ],
    trends: [
      "#55A6F3",
      "#E8684A",
      "#9270CA",
      "#59CB74",
      "#F5C73D",
      "#5D7092",
      "#6DC8EC",
      "#FF9845",
      "#1E9493",
      "#FF99C3",
    ],
    comparison: ["#5B8FF9", "#5AD8A6", "#5D7092", "#F6BD16", "#6DC8EC", "#945FB9", "#FF9845", "#1E9493"],
  },
  themes: {
    patients: ["#5B8FF9", "#61DDAA", "#65789B", "#F6BD16", "#7262FD", "#5D61BF"],
    diagnosis: ["#5B8FF9", "#5AD8A6", "#5D7092", "#F6BD16", "#6DC8EC", "#945FB9"],
    treatment: ["#13C2C2", "#5AD8A6", "#1E9493", "#006D75", "#52C41A", "#08979C"],
    outcomes: ["#1890FF", "#69C0FF", "#40A9FF", "#096DD9", "#0050B3", "#003A8C"],
    admin: ["#722ED1", "#9683EC", "#7C4DFF", "#5E35B1", "#512DA8", "#4527A0"],
  },
}

export const chartStyles = {
  tooltip: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid rgba(0, 0, 0, 0.03)",
    padding: "10px 14px",
    fontSize: "12px",
    color: "#384366",
  },
  legend: {
    fontSize: "12px",
    color: "#5E6C8F",
    iconSize: 10,
    padding: 5,
  },
  axis: {
    tickColor: "#E4E9F2",
    lineColor: "#E4E9F2",
    labelColor: "#5E6C8F",
    labelFontSize: "12px",
  },
  grid: {
    strokeDasharray: "3 3",
    stroke: "#E4E9F2",
    vertical: false,
  },
  animation: {
    duration: 1000,
    easing: "ease-out",
    staggered: true,
  },
  area: {
    fillOpacity: 0.6,
    strokeWidth: 2,
    activeDotSize: 6,
  },
  bar: {
    radius: 4,
    barGap: 4,
    barCategoryGap: 16,
  },
  line: {
    strokeWidth: 2,
    activeDotSize: 6,
    dotSize: 4,
  },
  pie: {
    innerRadius: 50,
    outerRadius: 90,
    paddingAngle: 2,
    labelOffset: 10,
    cornerRadius: 4,
  },
  radar: {
    fillOpacity: 0.6,
    strokeWidth: 2,
  },
}

export const getChartColorSet = (type: "categorical" | "sequential", count = 10) => {
  if (type === "categorical") {
    return chartPalette.charts.medical.slice(0, count)
  }
  // Add sequential color generation logic here if needed
  return chartPalette.charts.medical.slice(0, count)
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "completada":
      return chartPalette.clinical.healthy // Changed from completed to healthy
    case "cancelada":
      return chartPalette.clinical.critical // Changed from cancelled to critical
    case "pendiente":
      return chartPalette.clinical.attention // Changed from pending to attention
    case "presente":
      return chartPalette.clinical.stable // Changed from active to stable
    default:
      return chartPalette.neutral[500]
  }
}

// Add the missing getMedicalChartColors function
export const getMedicalChartColors = (count = 10) => {
  return chartPalette.charts.medical.slice(0, count)
}
