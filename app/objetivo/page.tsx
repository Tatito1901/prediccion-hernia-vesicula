"use client"
/* ------------------------------------------------------------------
   File: app/(marketing)/prediccion-conversion/page.tsx  ⟵ o en /components
   ------------------------------------------------------------------ */
   import { useEffect } from 'react';
   import Head from 'next/head';
   
   /** Página / componente principal */
   export default function PrediccionConversion() {
     /* Animaciones “fade-in” al hacer scroll */
     useEffect(() => {
       const sections = document.querySelectorAll<HTMLElement>('.fade-in-section');
   
       const observer = new IntersectionObserver(
         entries => {
           entries.forEach(entry => {
             if (entry.isIntersecting) entry.target.classList.add('is-visible');
           });
         },
         { threshold: 0.1 }
       );
   
       sections.forEach(section => observer.observe(section));
       /* Limpieza al desmontar */
       return () => sections.forEach(section => observer.unobserve(section));
     }, []);
   
     return (
       <>
         <Head>
           <title>Flujo de Sistema · Predicción de Conversión Quirúrgica</title>
           <meta
             name="description"
             content="Metodología para la optimización de la tasa de conversión quirúrgica mediante análisis predictivo."
           />
         </Head>
   
         {/* BODY ——————————————————————————————————————————————— */}
         <div className="antialiased font-inter bg-slate-50 text-slate-800">
           {/* HEADER */}
           <header className="bg-white py-6 shadow-sm sticky top-0 z-50">
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
               <h1 className="text-3xl font-extrabold tracking-tight">
                 Plataforma de Soporte a la Decisión Clínica
               </h1>
               <p className="mt-2 text-lg text-slate-500 max-w-3xl mx-auto">
                 Metodología para la optimización de la tasa de conversión
                 quirúrgica mediante análisis predictivo.
               </p>
             </div>
           </header>
   
           {/* MAIN */}
           <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-24">
             {/* --------------  FASE 1  -------------- */}
             <section id="fase-1" className="fade-in-section">
               <SectionHeader
                 fase="Fase 1"
                 title="Capitalización del Conocimiento Institucional"
                 subtitle="Transformamos el acervo de datos históricos en un activo estratégico para el modelado predictivo."
               />
   
               <div className="grid grid-cols-1 lg:grid-cols-5 items-center gap-8 lg:gap-12">
                 {/* ▼▼▼ Fuentes de datos ▼▼▼ */}
                 <div className="lg:col-span-2 space-y-8">
                   <Card
                     icon={
                       <DocumentIcon className="h-6 w-6 text-indigo-600" />
                     }
                     title="Datos Históricos de la Clínica"
                     text="Análisis de ~4 000 registros de pacientes (expedientes, encuestas previas) para identificar variables clave."
                   />
                   <Card
                     icon={<BarChartIcon className="h-6 w-6 text-indigo-600" />}
                     title="Proceso de ETL (Extracción, Transformación y Carga)"
                     text="Un script automatizado procesa y normaliza los datos heterogéneos en un formato estandarizado y analizable."
                   />
                 </div>
   
                 {/* Flecha horizontal / vertical (visible-responsive) */}
                 <ArrowDivider />
   
                 {/* ▼▼▼ Resultado ▼▼▼ */}
                 <div className="lg:col-span-2 section-card p-8 text-center bg-slate-50 border-slate-200">
                   <div className="icon-bg bg-white mx-auto">
                     <CheckListIcon className="h-8 w-8 text-indigo-600" />
                   </div>
   
                   <h3 className="text-2xl font-bold mt-4">Dataset de Entrenamiento</h3>
                   <p className="text-slate-500 mt-2">
                     Se genera una tabla maestra con la información clave de cada
                     paciente. Contiene:
                   </p>
                   <ul className="mt-4 text-left text-sm space-y-3">
                     <li>
                       <Tag>✓</Tag> Variables Clínicas y Demográficas
                     </li>
                     <li>
                       <Tag>✓</Tag> Factores Socioeconómicos y de Percepción
                     </li>
                     <li className="bg-green-100 text-green-800 p-3 rounded-lg font-semibold flex items-center gap-2">
                       <Tag asSpan className="bg-green-200">
                         🎯
                       </Tag>
                       <div>
                         <span className="block">Variable Objetivo:</span>
                         <span className="font-normal">
                           ¿El paciente se operó? (Sí/No)
                         </span>
                       </div>
                     </li>
                   </ul>
                 </div>
               </div>
             </section>
   
             {/* --------------  FASE 2  -------------- */}
             <section id="fase-2" className="fade-in-section">
               <SectionHeader
                 fase="Fase 2"
                 title="Motor de IA: Desarrollo del Modelo Predictivo"
                 subtitle="Se utiliza el dataset de entrenamiento para construir un modelo estadístico que identifica patrones de comportamiento."
               />
   
               <TimelineThreeSteps
                 steps={[
                   {
                     num: 1,
                     title: 'Entrenamiento y Calibración',
                     text: 'Se aplican algoritmos de clasificación para que el modelo aprenda la correlación entre las variables del paciente y su decisión final.',
                   },
                   {
                     num: 2,
                     title: 'Despliegue como Servicio API',
                     text: 'El modelo validado se implementa en un servidor seguro, listo para ser consumido por la aplicación de la clínica.',
                   },
                   {
                     num: 3,
                     title: 'Cálculo de Probabilidad',
                     text: 'La API procesa los datos de un nuevo paciente y retorna una probabilidad de conversión y los factores influyentes.',
                   },
                 ]}
               />
             </section>
   
             {/* --------------  FASE 3  -------------- */}
             <section id="fase-3" className="fade-in-section">
               <SectionHeader
                 fase="Fase 3"
                 title="Aplicación Práctica: Soporte en Tiempo Real"
                 subtitle="El sistema se integra en el flujo de trabajo clínico para proveer información accionable al médico."
               />
   
               {/* Contenedor con flujo + mockup */}
               <div className="section-card p-6 md:p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                   {/* ▲▲▲ Flujo de pasos ▲▲▲ */}
                   <FlowSteps />
   
                   {/* ▼▼▼ Mockup dashboard ▼▼▼ */}
                   <DashboardMockup />
                 </div>
               </div>
             </section>
   
             {/* --------------  FASE 4  -------------- */}
             <section id="fase-4" className="fade-in-section">
               <SectionHeader
                 fase="Fase 4"
                 title="Ciclo de Retroalimentación y Mejora Continua"
                 subtitle="El sistema evoluciona, incrementando su precisión y valor estratégico con el tiempo."
               />
   
               <FeedbackCycle />
             </section>
           </main>
   
           {/* FOOTER */}
           <footer className="text-center py-8">
             <p className="text-sm text-slate-500">
               © 2025 Clínica de Hernia y Vesícula. Todos los derechos reservados.
             </p>
           </footer>
         </div>
       </>
     );
   }
   
   /* ————————————————————————————————————————————————————————————
      ••• Componentes auxiliares •••
      (Pequeños para mantener la lectura clara; puedes extraerlos a su
      propio fichero cuando lo desees)                                         */
   function SectionHeader({
     fase,
     title,
     subtitle,
   }: {
     fase: string;
     title: string;
     subtitle: string;
   }) {
     return (
       <div className="text-center mb-12">
         <h2 className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">
           {fase}
         </h2>
         <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
           {title}
         </p>
         <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-500">
           {subtitle}
         </p>
       </div>
     );
   }
   
   function Card({
     icon,
     title,
     text,
   }: {
     icon: React.ReactNode;
     title: string;
     text: string;
   }) {
     return (
       <div className="section-card p-6">
         <div className="flex items-start gap-4">
           <div className="icon-bg">{icon}</div>
           <div>
             <h3 className="text-lg font-semibold">{title}</h3>
             <p className="text-sm text-slate-500 mt-1">{text}</p>
           </div>
         </div>
       </div>
     );
   }
   
   function TimelineThreeSteps({
     steps,
   }: {
     steps: { num: number; title: string; text: string }[];
   }) {
     return (
       <div className="relative">
         {/* línea de fondo */}
         <div className="absolute inset-y-0 w-full flex items-center justify-center">
           <div className="w-full h-px bg-slate-200" />
         </div>
         {/* pasos */}
         <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
           {steps.map(({ num, title, text }) => (
             <div key={num} className="flex flex-col items-center p-4">
               <div className="step-number">{num}</div>
               <h4 className="mt-4 text-lg font-semibold">{title}</h4>
               <p className="text-sm text-slate-500 mt-1">{text}</p>
             </div>
           ))}
         </div>
       </div>
     );
   }
   
   /* Flecha responsive (horizontal en desktop, vertical en móvil) */
   function ArrowDivider() {
     return (
       <>
         <div className="hidden lg:flex justify-center items-center">
           <ArrowIcon className="h-12 w-12 arrow" />
         </div>
         <div className="flex lg:hidden justify-center items-center my-4">
           <ArrowIcon className="h-12 w-12 arrow rotate-90" />
         </div>
       </>
     );
   }
   
   function Tag({
     children,
     asSpan = false,
     className = '',
   }: {
     children: React.ReactNode;
     asSpan?: boolean;
     className?: string;
   }) {
     const base =
       'tag bg-indigo-200 text-indigo-700 inline-block mr-2 align-middle';
     const TagElm = asSpan ? 'span' : 'div';
     return (
       <TagElm className={`${base} ${className}`.trim()}>{children}</TagElm>
     );
   }
   
   /* Para simplificar, los íconos se representan con <svg>.
      Abajo solo agrego un par; puedes completar el resto o importar heroicons */
   const ArrowIcon = (props: React.SVGProps<SVGSVGElement>) => (
     <svg
       xmlns="http://www.w3.org/2000/svg"
       fill="none"
       viewBox="0 0 24 24"
       strokeWidth={2}
       stroke="currentColor"
       {...props}
     >
       <line x1="5" y1="12" x2="19" y2="12" />
       <polyline points="12 5 19 12 12 19" />
     </svg>
   );
   
   const DocumentIcon = ArrowIcon; /* sustituye en producción */
   const BarChartIcon = ArrowIcon;
   const CheckListIcon = ArrowIcon;
   /* … y así sucesivamente … */
   
   /* ------------- Demo de flujo y mockup (fase 3) ------------- */
   function FlowSteps() {
     /* Por brevedad se dejó el markup directo; conviene refactorizarlo
        a un array.map como en TimelineThreeSteps */
     return (
       <div className="space-y-6">
         {/* Paso 1 */}
         <div>
           <Tag>Paso 1</Tag>
           <h4 className="text-lg font-semibold mt-2">
             Recolección de Datos del Paciente
           </h4>
           <p className="text-sm text-slate-500 mt-1">
             El paciente completa la encuesta digital estandarizada al
             registrarse en la clínica.
           </p>
         </div>
         {/* Flecha */}
         <div className="w-full text-center">
           <ArrowDownIcon className="h-8 w-8 text-slate-300 mx-auto" />
         </div>
         {/* Paso 2 */}
         <div>
           <Tag>Paso 2</Tag>
           <h4 className="text-lg font-semibold mt-2">Procesamiento por la API</h4>
           <p className="text-sm text-slate-500 mt-1">
             Las respuestas se envían al modelo de IA, que genera un análisis
             predictivo en segundos.
           </p>
         </div>
         {/* Flecha */}
         <div className="w-full text-center">
           <ArrowDownIcon className="h-8 w-8 text-slate-300 mx-auto" />
         </div>
         {/* Paso 3 */}
         <div>
           <Tag className="bg-indigo-100 text-indigo-700">Paso 3</Tag>
           <h4 className="text-lg font-semibold mt-2">Soporte a la Decisión Médica</h4>
           <p className="text-sm text-slate-500 mt-1">
             El médico recibe un resumen con la probabilidad y los factores clave
             para personalizar la consulta.
           </p>
         </div>
       </div>
     );
   }
   
   const ArrowDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
     <svg
       xmlns="http://www.w3.org/2000/svg"
       fill="none"
       viewBox="0 0 24 24"
       strokeWidth={2}
       stroke="currentColor"
       className={`${props.className} rotate-90`.trim()}
     >
       <line x1="12" y1="5" x2="12" y2="19" />
       <polyline points="19 12 12 19 5 12" />
     </svg>
   );
   
   function DashboardMockup() {
     return (
       <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
         {/* avatar y datos */}
         <div className="flex items-center gap-4 mb-4">
           <img
             src="https://placehold.co/48x48/475569/e2e8f0?text=JP"
             alt="Avatar del Paciente"
             className="w-12 h-12 rounded-full"
           />
           <div>
             <h5 className="font-bold text-white">Juan Pérez</h5>
             <p className="text-sm text-slate-400">
               Hernia Umbilical, 45 años
             </p>
           </div>
         </div>
   
         {/* probabilidad */}
         <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-center mb-6">
           <p className="text-sm font-medium text-red-300">
             Probabilidad de Conversión Quirúrgica
           </p>
           <p className="text-4xl font-bold text-white mt-1">
             35%{' '}
             <span className="text-2xl font-medium text-red-300">(Baja)</span>
           </p>
         </div>
   
         {/* factores clave */}
         <div className="space-y-4">
           <h6 className="text-sm font-semibold text-slate-300">
             Análisis de Factores Clave
           </h6>
   
           {/* Factor 1 */}
           <Factor
             iconColor="text-amber-400"
             title="Factor de Riesgo: Costo"
             text="Estrategia: Abordar proactivamente planes de financiamiento y el valor a largo plazo del procedimiento."
           />
   
           {/* Factor 2 */}
           <Factor
             iconColor="text-green-400"
             title="Factor Favorable: Confianza en el Médico"
             text="Estrategia: Reforzar la decisión del paciente destacando la experiencia y casos de éxito."
           />
         </div>
       </div>
     );
   }
   
   function Factor({
     iconColor,
     title,
     text,
   }: {
     iconColor: string;
     title: string;
     text: string;
   }) {
     return (
       <div className="bg-slate-700/50 p-3 rounded-lg flex items-start gap-3">
         <span className={`${iconColor} mt-1`}>
           {/* Icono genérico de alerta/escudo */}
           <svg
             xmlns="http://www.w3.org/2000/svg"
             className="h-5 w-5"
             fill="none"
             viewBox="0 0 24 24"
             strokeWidth={2}
             stroke="currentColor"
           >
             <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
             <line x1="12" y1="9" x2="12" y2="13" />
             <line x1="12" y1="17" x2="12.01" y2="17" />
           </svg>
         </span>
         <div>
           <p className="font-semibold">{title}</p>
           <p className="text-xs text-slate-400 mt-1">{text}</p>
         </div>
       </div>
     );
   }
   
   /* ------------- Ciclo de retroalimentación (fase 4) ------------- */
   function FeedbackCycle() {
     return (
       <div className="section-card p-8">
         <div className="flex flex-col md:flex-row items-center justify-around gap-8 text-center">
           <CycleStep
             icon={<CheckCircleIcon />}
             title="1. Registro de Resultados"
             text="El resultado final de cada paciente (operado/no operado) se registra sistemáticamente en la base de datos."
           />
           <ArrowDivider />
           <CycleStep
             icon={<UsersIcon />}
             title="2. Enriquecimiento del Dataset"
             text="Cada nuevo caso aporta más datos, incluyendo las nuevas variables de la encuesta digital."
           />
           <ArrowDivider />
           <CycleStep
             icon={<RefreshIcon />}
             title="3. Re-entrenamiento del Modelo"
             text="Periódicamente, el modelo se actualiza con los datos más recientes para mejorar su precisión y descubrir nuevos patrones."
           />
         </div>
       </div>
     );
   }
   
   function CycleStep({
     icon,
     title,
     text,
   }: {
     icon: React.ReactNode;
     title: string;
     text: string;
   }) {
     return (
       <div className="flex flex-col items-center max-w-xs">
         <div className="icon-bg">{icon}</div>
         <p className="mt-3 font-semibold">{title}</p>
         <p className="text-sm text-slate-500 mt-1">{text}</p>
       </div>
     );
   }
   
   /* Íconos stub */
   const CheckCircleIcon = () => <DocumentIcon className="h-6 w-6 text-indigo-600" />;
   const UsersIcon = CheckCircleIcon;
   const RefreshIcon = CheckCircleIcon;
   