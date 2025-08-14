import React, { useState, useEffect } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, ReferenceLine } from 'recharts';
import { useChartConfig } from './use-chart-config';

interface GenericLineChartProps {
  data: any[];
  xAxisKey: string;
  yAxisKey: string;
  lineColor: string;
  gradient?: boolean;
  area?: boolean;
  smooth?: boolean;
  showDots?: boolean;
  animated?: boolean;
  showTrend?: boolean;
}

// 🎨 Componente de tooltip personalizado elegante
const CustomTooltip = ({ active, payload, label }: any) => {
  const { tooltipStyle, isDark } = useChartConfig();
  
  if (active && payload && payload.length) {
    return (
      <div style={tooltipStyle}>
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: payload[0].color }}
          />
          <span className="font-semibold text-sm">{label}</span>
        </div>
        <div className="text-lg font-bold">
          {payload[0].value.toLocaleString()}
        </div>
        {payload[0].payload.trend && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${
            payload[0].payload.trend > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            <span>{payload[0].payload.trend > 0 ? '↗️' : '↘️'}</span>
            <span>{Math.abs(payload[0].payload.trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// 🎨 Componente de punto personalizado elegante
const CustomDot = ({ cx, cy, fill }: any) => {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={fill}
      stroke="white"
      strokeWidth={3}
      className="drop-shadow-md hover:r-6 transition-all duration-300"
      style={{
        filter: `drop-shadow(0 2px 4px ${fill}40)`,
        transition: 'all 0.3s ease'
      }}
    />
  );
};

export const GenericLineChart: React.FC<GenericLineChartProps> = ({ 
  data, 
  xAxisKey, 
  yAxisKey, 
  lineColor,
  gradient = false,
  area = false,
  smooth = true,
  showDots = true,
  animated = true,
  showTrend = false
}) => {
  const { baseLabelStyle, tickLineStyle, gridStyle, animations } = useChartConfig();
  const [animationKey, setAnimationKey] = useState(0);
  
  // 🎨 Trigger re-animation when data changes
  useEffect(() => {
    if (animated) {
      setAnimationKey(prev => prev + 1);
    }
  }, [data, animated]);
  
  // 🎨 Calcular línea de tendencia promedio
  const averageValue = data.length > 0
    ? data.reduce((sum, item) => sum + item[yAxisKey], 0) / data.length
    : 0;
  
  return (
    <div style={{}}>
      <ResponsiveContainer width="100%" height={350}>
        {area ? (
          <AreaChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            key={animationKey}
          >
          {/* 🎨 Grid elegante con líneas punteadas */}
          <CartesianGrid 
            strokeDasharray={gridStyle.strokeDasharray}
            vertical={false} 
            stroke={gridStyle.stroke}
            strokeWidth={gridStyle.strokeWidth}
            opacity={gridStyle.opacity}
          />
          
          {/* 🎨 Ejes con estilos modernos */}
          <XAxis 
            dataKey={xAxisKey} 
            tickLine={false} 
            axisLine={false} 
            tick={baseLabelStyle}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          
          <YAxis 
            tickLine={false} 
            axisLine={false} 
            tick={baseLabelStyle}
            tickFormatter={(value) => value.toLocaleString()}
          />
          
          {/* 🎨 Tooltip personalizado elegante */}
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{
              stroke: lineColor,
              strokeWidth: 2,
              strokeDasharray: '4 4',
              strokeOpacity: 0.6
            }}
          />
          
          {/* 🎨 Línea de tendencia promedio */}
          {showTrend && (
            <ReferenceLine
              y={averageValue}
              stroke={lineColor}
              strokeOpacity={0.4}
              strokeDasharray="8 8"
              label={{ value: "Promedio", position: "insideTopRight" }}
            />
          )}
          
          {/* 🎨 Área con gradientes y animaciones */}
          <Area 
            type={smooth ? "monotone" : "linear"}
            dataKey={yAxisKey} 
            stroke={lineColor}
            strokeWidth={2}
            fill={gradient ? `url(#lineGradient)` : lineColor}
            fillOpacity={0.3}
            dot={showDots ? <CustomDot /> : false}
            activeDot={{
              r: 8,
              fill: lineColor,
              stroke: 'white',
              strokeWidth: 3,
              style: {
                filter: `drop-shadow(0 4px 8px ${lineColor}40)`,
                transition: 'all 0.3s ease'
              }
            }}
            animationDuration={animated ? 1500 : 0}
            animationEasing="ease-in-out"
            animationBegin={300}
          />
          
          {/* 🎨 Definiciones de gradientes */}
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.6} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.1} />
            </linearGradient>
            
            {/* 🎨 Filtro de sombra para efectos */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          </defs>
        </AreaChart>
        ) : (
          <LineChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            key={animationKey}
          >
            {/* 🎨 Grid elegante con líneas punteadas */}
            <CartesianGrid 
              strokeDasharray={gridStyle.strokeDasharray}
              vertical={false} 
              stroke={gridStyle.stroke}
              strokeWidth={gridStyle.strokeWidth}
              opacity={gridStyle.opacity}
            />
            
            {/* 🎨 Ejes con estilos modernos */}
            <XAxis 
              dataKey={xAxisKey} 
              tickLine={false} 
              axisLine={false} 
              tick={baseLabelStyle}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              tick={baseLabelStyle}
              tickFormatter={(value) => value.toLocaleString()}
            />
            
            {/* 🎨 Tooltip personalizado elegante */}
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{
                stroke: lineColor,
                strokeWidth: 2,
                strokeDasharray: '4 4',
                strokeOpacity: 0.6
              }}
            />
            
            {/* 🎨 Línea de tendencia promedio */}
            {showTrend && (
              <ReferenceLine
                y={averageValue}
                stroke={lineColor}
                strokeOpacity={0.4}
                strokeDasharray="8 8"
                label={{ value: "Promedio", position: "insideTopRight" }}
              />
            )}
            
            {/* 🎨 Línea con gradientes y animaciones */}
            <Line 
              type={smooth ? "monotone" : "linear"}
              dataKey={yAxisKey} 
              stroke={lineColor}
              strokeWidth={3}
              fill="none"
              dot={showDots ? <CustomDot /> : false}
              activeDot={{
                r: 8,
                fill: lineColor,
                stroke: 'white',
                strokeWidth: 3,
                style: {
                  filter: `drop-shadow(0 4px 8px ${lineColor}40)`,
                  transition: 'all 0.3s ease'
                }
              }}
              animationDuration={animated ? 1500 : 0}
              animationEasing="ease-in-out"
              animationBegin={300}
            />
            
            {/* 🎨 Definiciones de gradientes */}
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.6} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.1} />
              </linearGradient>
              
              {/* 🎨 Filtro de sombra para efectos */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/> 
                </feMerge>
              </filter>
            </defs>
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
