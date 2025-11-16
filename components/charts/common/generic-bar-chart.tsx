import React, { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { useChartConfig } from './use-chart-config';

interface GenericBarChartProps {
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  yAxisKey: string;
  colors: string[];
  gradient?: boolean;
  animated?: boolean;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; color: string }>;
  label?: string;
}

// 🎨 Componente de tooltip personalizado elegante
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  const { tooltipStyle, isDark } = useChartConfig();
  
  if (active && payload && payload.length) {
    const val = Number(payload?.[0]?.value ?? 0);
    return (
      <div style={tooltipStyle}>
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: payload[0].color }}
          />
          <span className="font-semibold text-sm">{label}</span>
        </div>
        <div className="text-lg font-bold">{val.toLocaleString()}</div>
      </div>
    );
  }
  return null;
};

export const GenericBarChart: React.FC<GenericBarChartProps> = ({ 
  data, 
  xAxisKey, 
  yAxisKey, 
  colors, 
  gradient = false,
  animated = true 
}) => {
  const { baseLabelStyle, tickLineStyle, gridStyle, animations } = useChartConfig();
  const [animationKey, setAnimationKey] = useState(0);
  
  // 🎨 Trigger re-animation when data changes
  useEffect(() => {
    if (animated) {
      setAnimationKey(prev => prev + 1);
    }
  }, [data, animated]);
  
  return (
    <div style={{}}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart 
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
              fill: 'rgba(99, 102, 241, 0.08)', 
              radius: 6,
              stroke: 'rgba(99, 102, 241, 0.2)',
              strokeWidth: 2
            }}
          />
          
          {/* 🎨 Barras con gradientes y animaciones */}
          <Bar 
            dataKey={yAxisKey} 
            radius={[8, 8, 0, 0]}
            fill={colors[0] || '#667eea'}
            animationDuration={animated ? 1000 : 0}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={gradient 
                  ? `url(#gradient-${index % colors.length})` 
                  : colors[index % colors.length] || '#667eea'
                }
                stroke={colors[index % colors.length] || '#667eea'}
                strokeWidth={2}
                strokeOpacity={0.3}
              />
            ))}
          </Bar>
          
          {/* 🎨 Definiciones de gradientes */}
          {gradient && (
            <defs>
              {colors.map((color, index) => (
                <linearGradient 
                  key={`gradient-${index}`}
                  id={`gradient-${index}`} 
                  x1="0" 
                  y1="0" 
                  x2="0" 
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                </linearGradient>
              ))}
            </defs>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
