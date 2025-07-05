"use client"
import React, { useState, useEffect } from 'react';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertCircle, Download, Info, Heart, Activity, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

/** ----------------------  Tipos  ---------------------- **/
type Reading = {
  minute: number;
  pas: number | '';
  pad: number | '';
  hr: number | '';
  symptoms?: string;
};

type DiagnosisResult = {
  diagnosis: string;
  type: 'normal' | 'warning' | 'abnormal';
  details: string[];
  recommendations: string[];
  deltaHR?: number;
  deltaSBP?: number;
  deltaDBP?: number;
};

type PatientInfo = {
  name: string;
  age: number | '';
  date: string;
  medications: string;
};

/** ---------------- Algoritmo clínico mejorado ------------------ **/
function computeDiagnosis(readings: Reading[], age: number | ''): DiagnosisResult {
  const valid = readings.filter(r => r.pas !== '' && r.pad !== '' && r.hr !== '');
  
  if (valid.length < 5) {
    return {
      diagnosis: 'Datos insuficientes',
      type: 'normal',
      details: ['Se requieren al menos 5 mediciones completas para el diagnóstico'],
      recommendations: ['Complete todas las mediciones requeridas']
    };
  }

  // Valores basales (promedio de lecturas supinas)
  const supine = valid.filter(r => r.minute < 0);
  if (supine.length === 0) {
    return {
      diagnosis: 'Error: Sin valores basales',
      type: 'warning',
      details: ['No se encontraron mediciones en posición supina'],
      recommendations: ['Registre al menos una medición en posición supina']
    };
  }

  const baseSBP = supine.reduce((s, r) => s + Number(r.pas), 0) / supine.length;
  const baseDBP = supine.reduce((s, r) => s + Number(r.pad), 0) / supine.length;
  const baseHR = supine.reduce((s, r) => s + Number(r.hr), 0) / supine.length;

  // Variables diagnósticas
  let maxDeltaHR = 0;
  let maxDeltaSBP = 0;
  let maxDeltaDBP = 0;
  let hoClassic = false;
  let hoDelayed = false;
  let hoInitial = false;
  let pots = false;
  let nhResponse = false;
  let sustainedHO = false;
  
  const hoMinutes: number[] = [];
  const details: string[] = [];

  // Análisis de cada lectura ortostática
  valid.forEach(r => {
    if (r.minute >= 0) {
      const deltaSBP = baseSBP - Number(r.pas);
      const deltaDBP = baseDBP - Number(r.pad);
      const deltaHR = Number(r.hr) - baseHR;

      // Actualizar máximos
      if (Math.abs(deltaHR) > Math.abs(maxDeltaHR)) maxDeltaHR = deltaHR;
      if (deltaSBP > maxDeltaSBP) maxDeltaSBP = deltaSBP;
      if (deltaDBP > maxDeltaDBP) maxDeltaDBP = deltaDBP;

      // Criterios POTS (ajustado por edad)
      const potsThreshold = age !== '' && Number(age) < 19 ? 40 : 30;
      if (deltaHR >= potsThreshold && deltaSBP < 20 && deltaDBP < 10) {
        pots = true;
      }

      // Hipotensión ortostática
      if (deltaSBP >= 20 || deltaDBP >= 10) {
        hoMinutes.push(r.minute);
        if (r.minute <= 3) hoClassic = true;
        else hoDelayed = true;
      }

      // HO inicial (primeros 15 segundos)
      if (r.minute === 0 && deltaSBP >= 40 && deltaDBP >= 20) {
        hoInitial = true;
      }

      // Respuesta neuralmente mediada
      if (r.minute >= 3 && (deltaSBP >= 30 || deltaDBP >= 15) && deltaHR < 15) {
        nhResponse = true;
      }
    }
  });

  // HO sostenida
  if (hoMinutes.length >= 3) {
    sustainedHO = true;
  }

  // Generar diagnóstico
  let diagnosis = 'Respuesta ortostática normal';
  let type: 'normal' | 'warning' | 'abnormal' = 'normal';
  const recommendations: string[] = [];

  // Detalles de cambios máximos
  details.push(`Cambio máximo FC: ${maxDeltaHR > 0 ? '+' : ''}${maxDeltaHR.toFixed(0)} lpm`);
  details.push(`Cambio máximo PAS: -${maxDeltaSBP.toFixed(0)} mmHg`);
  details.push(`Cambio máximo PAD: -${maxDeltaDBP.toFixed(0)} mmHg`);

  if (hoInitial) {
    diagnosis = 'Hipotensión ortostática inicial';
    type = 'abnormal';
    details.push('Caída brusca de PA en los primeros 15 segundos');
    details.push('Sugiere disfunción autonómica grave');
    recommendations.push('Levantarse muy lentamente');
    recommendations.push('Considerar medias de compresión');
    recommendations.push('Evaluación por especialista en disautonomía');
  } else if (hoClassic && sustainedHO) {
    diagnosis = 'Hipotensión ortostática clásica sostenida';
    type = 'abnormal';
    details.push('Caída de PA ≥20/10 mmHg en los primeros 3 minutos');
    details.push('Hipotensión mantenida durante la prueba');
    recommendations.push('Aumentar ingesta de líquidos (2-3L/día)');
    recommendations.push('Aumentar ingesta de sal (10-12g/día si no hay contraindicación)');
    recommendations.push('Evaluar medicamentos hipotensores');
    recommendations.push('Considerar fludrocortisona o midodrina');
  } else if (hoClassic) {
    diagnosis = 'Hipotensión ortostática clásica';
    type = 'abnormal';
    details.push('Caída de PA ≥20/10 mmHg en los primeros 3 minutos');
    recommendations.push('Levantarse gradualmente');
    recommendations.push('Ejercicios de contracción muscular');
    recommendations.push('Hidratación adecuada');
  } else if (hoDelayed) {
    diagnosis = 'Hipotensión ortostática diferida';
    type = 'warning';
    details.push('Caída de PA ≥20/10 mmHg después de 3 minutos');
    details.push('Puede progresar a HO clásica');
    recommendations.push('Monitoreo regular de PA');
    recommendations.push('Evitar bipedestación prolongada');
  } else if (pots) {
    diagnosis = 'Síndrome de taquicardia ortostática postural (POTS)';
    type = 'abnormal';
    details.push(`Aumento de FC ≥${age !== '' && Number(age) < 19 ? 40 : 30} lpm sin hipotensión`);
    details.push('Compatible con disautonomía');
    recommendations.push('Programa de ejercicio gradual');
    recommendations.push('Hidratación con electrolitos');
    recommendations.push('Considerar betabloqueadores selectivos');
    recommendations.push('Evaluación por especialista');
  } else if (nhResponse) {
    diagnosis = 'Respuesta neuralmente mediada';
    type = 'warning';
    details.push('Caída tardía de PA con bradicardia relativa');
    recommendations.push('Identificar y evitar triggers');
    recommendations.push('Maniobras de contrapresión');
  }

  return {
    diagnosis,
    type,
    details,
    recommendations,
    deltaHR: maxDeltaHR,
    deltaSBP: maxDeltaSBP,
    deltaDBP: maxDeltaDBP
  };
}

/** ------------- Componente principal ---------------- **/
export default function NASALeanTest() {
  // Estado inicial con más minutos para mejor análisis
  const initialReadings: Reading[] = [
    { minute: -2, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: -1, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: 0, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: 1, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: 2, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: 3, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: 4, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: 5, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: 7, pas: '', pad: '', hr: '', symptoms: '' },
    { minute: 10, pas: '', pad: '', hr: '', symptoms: '' },
  ];

  const [readings, setReadings] = useState<Reading[]>(initialReadings);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    age: '',
    date: new Date().toISOString().split('T')[0],
    medications: ''
  });
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  // Preparar datos para el gráfico
  const chartData = readings
    .filter(r => r.pas !== '' && r.pad !== '' && r.hr !== '')
    .map(r => ({
      minute: r.minute,
      PAS: Number(r.pas),
      PAD: Number(r.pad),
      FC: Number(r.hr),
      label: r.minute < 0 ? `Supino ${r.minute}` : `Min ${r.minute}`
    }));

  const handleReadingChange = (idx: number, field: keyof Reading, value: string) => {
    setReadings(prev => {
      const updated = [...prev];
      if (field === 'symptoms') {
        updated[idx] = { ...updated[idx], [field]: value };
      } else {
        updated[idx] = { ...updated[idx], [field]: value === '' ? '' : Number(value) };
      }
      return updated;
    });
  };

  const handlePatientChange = (field: keyof PatientInfo, value: string) => {
    setPatientInfo(prev => ({
      ...prev,
      [field]: field === 'age' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleCalculate = () => {
    const diagnosis = computeDiagnosis(readings, patientInfo.age);
    setResult(diagnosis);
  };

  const handleExport = () => {
    const data = {
      patientInfo,
      readings: readings.filter(r => r.pas !== '' && r.pad !== '' && r.hr !== ''),
      result,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nasa-lean-test-${patientInfo.name || 'paciente'}-${patientInfo.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setReadings(initialReadings);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">NASA Lean Test</h1>
              <p className="text-gray-600 mt-1">Evaluación de disautonomía y respuesta ortostática</p>
            </div>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Info size={20} />
              {showInstructions ? 'Ocultar' : 'Mostrar'} instrucciones
            </button>
          </div>

          {/* Instrucciones */}
          {showInstructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-blue-900 mb-2">Protocolo de la prueba:</h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. Paciente en decúbito supino por 10 minutos</li>
                <li>2. Tomar 2 mediciones basales (minutos -2 y -1)</li>
                <li>3. Paciente se levanta rápidamente (en &lt;3 segundos)</li>
                <li>4. Permanecer de pie sin moverse por 10 minutos</li>
                <li>5. Registrar PA y FC en los tiempos indicados</li>
                <li>6. Anotar síntomas si aparecen</li>
              </ol>
              <div className="mt-3 text-sm text-blue-700">
                <strong>Importante:</strong> Tener equipo de reanimación disponible. 
                Detener si hay síncope inminente.
              </div>
            </div>
          )}
        </div>

        {/* Información del paciente */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Información del paciente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={patientInfo.name}
                onChange={(e) => handlePatientChange('name', e.target.value)}
                placeholder="Nombre del paciente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Edad
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={patientInfo.age}
                onChange={(e) => handlePatientChange('age', e.target.value)}
                placeholder="Años"
                min="1"
                max="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={patientInfo.date}
                onChange={(e) => handlePatientChange('date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medicamentos
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={patientInfo.medications}
                onChange={(e) => handlePatientChange('medications', e.target.value)}
                placeholder="Medicación actual"
              />
            </div>
          </div>
        </div>

        {/* Tabla de mediciones */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Registro de mediciones</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Tiempo</th>
                  <th className="text-left py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Activity size={16} className="text-red-500" />
                      PAS (mmHg)
                    </div>
                  </th>
                  <th className="text-left py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Activity size={16} className="text-blue-500" />
                      PAD (mmHg)
                    </div>
                  </th>
                  <th className="text-left py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Heart size={16} className="text-green-500" />
                      FC (lpm)
                    </div>
                  </th>
                  <th className="text-left py-3 px-4">Síntomas</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading, idx) => (
                  <tr key={idx} className={`border-b ${reading.minute < 0 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2 px-4 font-medium">
                      {reading.minute < 0 ? (
                        <span className="text-gray-600">Supino {reading.minute}</span>
                      ) : (
                        <span>Min {reading.minute}</span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        className="w-24 border border-gray-300 rounded px-2 py-1"
                        value={reading.pas}
                        onChange={(e) => handleReadingChange(idx, 'pas', e.target.value)}
                        min="50"
                        max="250"
                        placeholder="120"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        className="w-24 border border-gray-300 rounded px-2 py-1"
                        value={reading.pad}
                        onChange={(e) => handleReadingChange(idx, 'pad', e.target.value)}
                        min="30"
                        max="150"
                        placeholder="80"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        className="w-24 border border-gray-300 rounded px-2 py-1"
                        value={reading.hr}
                        onChange={(e) => handleReadingChange(idx, 'hr', e.target.value)}
                        min="30"
                        max="200"
                        placeholder="70"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-2 py-1"
                        value={reading.symptoms || ''}
                        onChange={(e) => handleReadingChange(idx, 'symptoms', e.target.value)}
                        placeholder="Ninguno"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCalculate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md flex items-center gap-2"
            >
              <TrendingUp size={20} />
              Calcular diagnóstico
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-2 rounded-md"
            >
              Limpiar datos
            </button>
          </div>
        </div>

        {/* Gráfico */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Gráfico de respuesta ortostática</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="label" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" label={{ value: 'Presión (mmHg)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'FC (lpm)', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <ReferenceLine x="Min 0" stroke="#666" strokeDasharray="5 5" label="De pie" />
                <Line yAxisId="left" type="monotone" dataKey="PAS" stroke="#ef4444" name="PAS" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="PAD" stroke="#3b82f6" name="PAD" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="FC" stroke="#10b981" name="FC" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Resultados */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Resultados del diagnóstico</h2>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Download size={20} />
                Exportar resultados
              </button>
            </div>

            <div className={`rounded-lg p-4 mb-4 ${
              result.type === 'normal' ? 'bg-green-50 border border-green-200' :
              result.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {result.type === 'normal' ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : result.type === 'warning' ? (
                  <AlertCircle className="text-yellow-600" size={24} />
                ) : (
                  <XCircle className="text-red-600" size={24} />
                )}
                <h3 className="text-lg font-semibold">{result.diagnosis}</h3>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info size={18} />
                  Detalles del diagnóstico
                </h4>
                <ul className="space-y-1">
                  {result.details.map((detail, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock size={18} />
                  Recomendaciones
                </h4>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Resumen de cambios máximos */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-3">Resumen de cambios ortostáticos máximos</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {result.deltaHR !== undefined ? `${result.deltaHR > 0 ? '+' : ''}${result.deltaHR}` : '—'}
                  </div>
                  <div className="text-sm text-gray-600">Δ FC (lpm)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {result.deltaSBP !== undefined ? `-${result.deltaSBP}` : '—'}
                  </div>
                  <div className="text-sm text-gray-600">Δ PAS (mmHg)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {result.deltaDBP !== undefined ? `-${result.deltaDBP}` : '—'}
                  </div>
                  <div className="text-sm text-gray-600">Δ PAD (mmHg)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Criterios diagnósticos de referencia */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Criterios diagnósticos de referencia</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Hipotensión ortostática (HO)</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>HO Clásica:</strong> ↓PAS ≥20 o PAD ≥10 mmHg en 3 min</li>
                <li>• <strong>HO Diferida:</strong> ↓PAS ≥20 o PAD ≥10 mmHg después de 3 min</li>
                <li>• <strong>HO Inicial:</strong> ↓PAS ≥40 y PAD ≥20 mmHg en 15 seg</li>
                <li>• <strong>HO en HTA:</strong> ↓PAS ≥30 mmHg</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">POTS y otros</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>POTS adultos:</strong> ↑FC ≥30 lpm sin HO</li>
                <li>• <strong>POTS &lt;19 años:</strong> ↑FC ≥40 lpm sin HO</li>
                <li>• <strong>Intolerancia ortostática:</strong> Síntomas sin criterios de HO/POTS</li>
                <li>• <strong>Respuesta neuralmente mediada:</strong> ↓PA tardía con bradicardia relativa</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}