const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Definición de componentes y sus nuevas ubicaciones
const componentMappings = {
  // Autenticación
  'login-page': 'auth/login-page',
  
  // Navegación
  'nav-documents': 'navigation/nav-documents',
  'nav-main': 'navigation/nav-main',
  'nav-secondary': 'navigation/nav-secondary',
  'nav-user': 'navigation/nav-user',
  'app-sidebar': 'navigation/app-sidebar',
  'site-header': 'navigation/site-header',
  
  // Dashboard
  'dashboard-metrics': 'dashboard/dashboard-metrics',
  'ai-analysis-dashboard': 'dashboard/ai-analysis-dashboard',
  'survey-analysis-dashboard': 'dashboard/survey-analysis-dashboard',
  'patient-analytics': 'dashboard/patient-analytics',
  
  // Estadísticas
  'appointment-statistics': 'statistics/appointment-statistics',
  'clinic-statistics': 'statistics/clinic-statistics',
  'doctor-stats': 'statistics/doctor-stats',
  'survey-statistics': 'statistics/survey-statistics',
  
  // Pacientes
  'patient-admission': 'patients/patient-admission',
  'patient-card-mobile': 'patients/patient-card-mobile',
  'patient-details': 'patients/patient-details',
  'patient-management': 'patients/patient-management',
  'patient-preview': 'patients/patient-preview',
  'patient-table': 'patients/patient-table',
  
  // Encuestas
  'patient-survey-form': 'surveys/patient-survey-form',
  'survey-completion-modal': 'surveys/survey-completion-modal',
  'survey-results-analyzer': 'surveys/survey-results-analyzer',
  'survey-share-dialog': 'surveys/survey-share-dialog',
  'medical-survey-analysis': 'surveys/medical-survey-analysis',
  'medical-survey-analysis-desktop': 'surveys/medical-survey-analysis-desktop',
  'medical-survey-analysis-mobile': 'surveys/medical-survey-analysis-mobile',
  
  // Gráficos
  'chart-area-interactive': 'charts/chart-area-interactive',
  'chart-diagnostic': 'charts/chart-diagnostic',
  'diagnosis-bar-chart': 'charts/diagnosis-bar-chart',
  'diagnosis-chart': 'charts/diagnosis-chart',
  'diagnosis-severity-chart': 'charts/diagnosis-severity-chart',
  'diagnosis-timeline-chart': 'charts/diagnosis-timeline-chart',
  'diagnosis-type-distribution': 'charts/diagnosis-type-distribution',
  
  // Tablas
  'data-table': 'tables/data-table',
  'responsive-table': 'tables/responsive-table',
  'table-skeleton': 'tables/table-skeleton',
  
  // Médicos
  'medical-consultation': 'medical/medical-consultation',
  'crm-followup': 'medical/crm-followup',
  'pending-followups': 'medical/pending-followups',
  
  // Cirugía
  'surgery-management': 'surgery/surgery-management',
  'surgery-recommendation-card': 'surgery/surgery-recommendation-card',
  
  // Layout
  'responsive-layout': 'layout/responsive-layout',
  'section-cards': 'layout/section-cards',
  'theme-provider': 'layout/theme-provider',
  
  // Formularios
  'edit-patient-form': 'forms/edit-patient-form',
  'new-patient-form': 'forms/new-patient-form',
};

// Función para buscar y reemplazar importaciones en un archivo
function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Reemplazar las importaciones
    for (const [oldPath, newPath] of Object.entries(componentMappings)) {
      const regex = new RegExp(`from ["']@/components/${oldPath}["']`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `from "@/components/${newPath}"`);
        hasChanges = true;
        console.log(`\x1b[32m✓\x1b[0m Updated import in ${filePath}: ${oldPath} -> ${newPath}`);
      }
      
      // También buscar importaciones con extensión .tsx
      const regexWithExt = new RegExp(`from ["']@/components/${oldPath}.tsx["']`, 'g');
      if (regexWithExt.test(content)) {
        content = content.replace(regexWithExt, `from "@/components/${newPath}.tsx"`);
        hasChanges = true;
        console.log(`\x1b[32m✓\x1b[0m Updated import in ${filePath}: ${oldPath}.tsx -> ${newPath}.tsx`);
      }
      
      // Manejar importaciones dinámicas (como React.lazy)
      const dynamicRegex = new RegExp(`["']@/components/${oldPath}["']`, 'g');
      if (dynamicRegex.test(content)) {
        content = content.replace(dynamicRegex, `"@/components/${newPath}"`);
        hasChanges = true;
        console.log(`\x1b[32m✓\x1b[0m Updated dynamic import in ${filePath}: ${oldPath} -> ${newPath}`);
      }
    }
    
    // Guardar el archivo si hubo cambios
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    
    return hasChanges;
  } catch (error) {
    console.error(`\x1b[31m✗\x1b[0m Error processing file ${filePath}:`, error.message);
    return false;
  }
}

// Función para recorrer recursivamente un directorio
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let updatedFiles = 0;
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Omitir node_modules y .next
      if (file !== 'node_modules' && file !== '.next') {
        updatedFiles += processDirectory(filePath);
      }
    } else if (stats.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js'))) {
      if (updateImportsInFile(filePath)) {
        updatedFiles++;
      }
    }
  }
  
  return updatedFiles;
}

// Directorio principal del proyecto
const projectDir = __dirname;

console.log('Actualizando importaciones de componentes...');
const updatedFiles = processDirectory(projectDir);
console.log(`\nProceso completado! Se actualizaron importaciones en ${updatedFiles} archivos.`);
