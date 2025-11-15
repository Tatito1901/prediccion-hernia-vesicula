import React, { useState, useEffect, memo, useCallback } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useChartConfig } from './use-chart-config';

interface GenericPieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
  showLabels?: boolean;
  donut?: boolean;
  animated?: boolean;
}

// 🎨 Componente de tooltip personalizado elegante con validación de datos (memoizado)
const CustomTooltip = memo(({ active, payload }: any) => {
  const { tooltipStyle, isDark } = useChartConfig();
  
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data?.value ?? 0;
    const total = data?.total ?? 0;
    const name = data?.name ?? 'Sin nombre';
    
    return (
      <div style={tooltipStyle}>
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: payload[0].color }}
          />
          <span className="font-semibold text-sm">{name}</span>
        </div>
        <div className="text-lg font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'}%
        </div>
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

// 🎨 Componente de leyenda personalizado elegante (memoizado)
const CustomLegend = memo(({ payload }: any) => {
  const { isDark } = useChartConfig();
  
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full shadow-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span 
            className={`text-sm font-medium ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
});
CustomLegend.displayName = 'CustomLegend';

// 🎨 Función para renderizar etiquetas personalizadas
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="font-semibold text-sm drop-shadow-lg"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const GenericPieChart: React.FC<GenericPieChartProps> = ({ 
  data, 
  dataKey, 
  nameKey, 
  colors,
  showLabels = true,
  donut = false,
  animated = true
}) => {
  const { animations } = useChartConfig();
  const [animationKey, setAnimationKey] = useState(0);
  
  // 🎨 Trigger re-animation when data changes
  useEffect(() => {
    if (animated) {
      setAnimationKey(prev => prev + 1);
    }
  }, [data, animated]);
  
  // 🎨 Calcular el total para porcentajes (optimizado)
  const totalValue = Array.isArray(data)
    ? data.reduce((sum, d) => sum + (Number(d?.[dataKey]) || 0), 0)
    : 0;
  const dataWithTotal = (Array.isArray(data) ? data : []).map(item => ({
    ...item,
    total: totalValue
  }));
  
  return (
    <div className={animated ? 'animate-fade-in-up' : ''}>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart key={animationKey}>
          {/* 🎨 Tooltip personalizado elegante */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* 🎨 Leyenda personalizada elegante */}
          <Legend content={<CustomLegend />} />
          
          {/* 🎨 Pie chart con efectos modernos */}
          <Pie 
            data={dataWithTotal} 
            dataKey={dataKey} 
            nameKey={nameKey} 
            cx="50%" 
            cy="45%" 
            outerRadius={110}
            innerRadius={donut ? 50 : 0}
            paddingAngle={2}
            label={showLabels ? renderCustomLabel : false}
            labelLine={false}
            animationDuration={animated ? 1200 : 0}
            animationEasing="ease-out"
            animationBegin={200}
          >
            {dataWithTotal.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]} 
                stroke={colors[index % colors.length]}
                strokeWidth={0}
                className="drop-shadow-md hover:drop-shadow-lg transition-all duration-300"
                style={{
                  filter: `drop-shadow(0 4px 6px ${colors[index % colors.length]}20)`,
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </Pie>
          
          {/* 🎨 Definiciones de gradientes para efectos */}
          <defs>
            {colors.map((color, index) => (
              <linearGradient 
                key={`pieGradient-${index}`}
                id={`pieGradient-${index}`} 
                x1="0" 
                y1="0" 
                x2="1" 
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
