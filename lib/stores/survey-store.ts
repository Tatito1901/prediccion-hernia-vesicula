// lib/stores/survey-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';

// Define los tipos de encuestas disponibles
export enum SurveyType {
  HERNIA = 'hernia',
  VESICULA = 'vesicula',
  GENERAL = 'general'
}

// Interfaz para una encuesta
export interface Survey {
  id: string;
  title: string;
  description: string;
  type: SurveyType;
  questions: SurveyQuestion[];
}

// Tipos de preguntas soportados
export enum QuestionType {
  TEXT = 'text',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  SCALE = 'scale',
  BOOLEAN = 'boolean'
}

// Interfaz para una pregunta de encuesta
export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

// Interfaz para una asignación de encuesta a un paciente
export interface SurveyAssignment {
  id: string;
  patientId: string;
  appointmentId: string;
  surveyId: string;
  assignedDate: Date;
  completedDate?: Date;
  status: 'assigned' | 'pending' | 'completed';
  shareUrl?: string;
}

// Interfaz para las respuestas a una encuesta
export interface SurveyResponse {
  id: string;
  assignmentId: string;
  questionId: string;
  answer: string | string[] | number | boolean;
  timestamp: Date;
}

// Estado del store
interface SurveyState {
  surveys: Survey[];
  assignments: SurveyAssignment[];
  responses: SurveyResponse[];
  isLoading: boolean;
  error: string | null;

  // Acciones para encuestas
  getSurveys: () => Promise<Survey[]>;
  getSurveyById: (id: string) => Survey | undefined;
  getSurveysByType: (type: SurveyType) => Survey[];
  
  // Acciones para asignaciones de encuestas
  assignSurveyToPatient: (patientId: string, appointmentId: string, surveyId: string) => Promise<SurveyAssignment>;
  getPatientSurveyAssignments: (patientId: string) => SurveyAssignment[];
  getAssignmentById: (id: string) => SurveyAssignment | undefined;
  updateAssignmentStatus: (id: string, status: 'assigned' | 'pending' | 'completed', completedDate?: Date) => void;
  
  // Acciones para respuestas
  saveResponse: (assignmentId: string, questionId: string, answer: string | string[] | number | boolean) => void;
  getResponsesByAssignment: (assignmentId: string) => SurveyResponse[];
  getResponsesForPatient: (patientId: string) => { assignment: SurveyAssignment, responses: SurveyResponse[] }[];
}

// Datos de ejemplo para las encuestas
const initialSurveys: Survey[] = [
  {
    id: 'hernia-survey',
    title: 'Evaluación de Hernia',
    description: 'Cuestionario para pacientes con síntomas de hernia',
    type: SurveyType.HERNIA,
    questions: [
      {
        id: 'h1',
        text: '¿Ha notado algún bulto o protuberancia en el abdomen o la ingle?',
        type: QuestionType.BOOLEAN,
        required: true
      },
      {
        id: 'h2',
        text: '¿Desde cuándo ha notado estos síntomas?',
        type: QuestionType.TEXT,
        required: true
      },
      {
        id: 'h3',
        text: '¿Cómo calificaría su dolor en una escala del 1 al 10?',
        type: QuestionType.SCALE,
        required: true,
        min: 1,
        max: 10
      },
      {
        id: 'h4',
        text: '¿Qué actividades aumentan su dolor o incomodidad?',
        type: QuestionType.CHECKBOX,
        required: true,
        options: ['Levantar objetos pesados', 'Toser', 'Ejercicio físico', 'Estar de pie mucho tiempo', 'Otro']
      }
    ]
  },
  {
    id: 'vesicula-survey',
    title: 'Evaluación de Vesícula',
    description: 'Cuestionario para pacientes con síntomas de problemas vesiculares',
    type: SurveyType.VESICULA,
    questions: [
      {
        id: 'v1',
        text: '¿Ha experimentado dolor en la parte superior derecha del abdomen?',
        type: QuestionType.BOOLEAN,
        required: true
      },
      {
        id: 'v2',
        text: '¿El dolor empeora después de comer alimentos grasos?',
        type: QuestionType.RADIO,
        required: true,
        options: ['Sí, siempre', 'A veces', 'Rara vez', 'No']
      },
      {
        id: 'v3',
        text: '¿Ha experimentado náuseas o vómitos con el dolor?',
        type: QuestionType.BOOLEAN,
        required: true
      },
      {
        id: 'v4',
        text: '¿Qué alimentos desencadenan sus síntomas?',
        type: QuestionType.TEXT,
        required: false
      }
    ]
  },
  {
    id: 'general-survey',
    title: 'Evaluación General',
    description: 'Cuestionario general para todos los pacientes',
    type: SurveyType.GENERAL,
    questions: [
      {
        id: 'g1',
        text: 'Describa brevemente su principal motivo de consulta',
        type: QuestionType.TEXT,
        required: true
      },
      {
        id: 'g2',
        text: '¿Tiene antecedentes de cirugías previas?',
        type: QuestionType.BOOLEAN,
        required: true
      },
      {
        id: 'g3',
        text: '¿Qué medicamentos toma actualmente?',
        type: QuestionType.TEXT,
        required: true
      },
      {
        id: 'g4',
        text: '¿Tiene alguna alergia conocida?',
        type: QuestionType.TEXT,
        required: false
      }
    ]
  }
];

// Crear el store con Zustand e immer para actualizaciones inmutables
export const useSurveyStore = create<SurveyState>()(
  immer((set, get) => ({
    surveys: initialSurveys,
    assignments: [],
    responses: [],
    isLoading: false,
    error: null,

    // Implementación de acciones para encuestas
    getSurveys: async () => {
      set({ isLoading: true, error: null });
      try {
        // Aquí se podría hacer una llamada a API en un entorno real
        // Por ahora usamos datos de ejemplo
        set({ isLoading: false });
        return get().surveys;
      } catch (error) {
        set({ isLoading: false, error: 'Error al cargar encuestas' });
        return [];
      }
    },

    getSurveyById: (id: string) => {
      return get().surveys.find(survey => survey.id === id);
    },

    getSurveysByType: (type: SurveyType) => {
      return get().surveys.filter(survey => survey.type === type);
    },

    // Implementación de acciones para asignaciones
    assignSurveyToPatient: async (patientId: string, appointmentId: string, surveyId: string) => {
      set({ isLoading: true, error: null });
      try {
        // Crear URL única para compartir
        const shareUrl = `${window.location.origin}/surveys/complete?assignment=${uuidv4()}`;
        
        // Crear nueva asignación
        const newAssignment: SurveyAssignment = {
          id: uuidv4(),
          patientId,
          appointmentId,
          surveyId,
          assignedDate: new Date(),
          status: 'assigned',
          shareUrl
        };
        
        // Actualizar el estado
        set(state => {
          state.assignments.push(newAssignment);
          state.isLoading = false;
        });
        
        return newAssignment;
      } catch (error) {
        set({ isLoading: false, error: 'Error al asignar encuesta' });
        throw new Error('Error al asignar encuesta');
      }
    },

    getPatientSurveyAssignments: (patientId: string) => {
      return get().assignments.filter(assignment => assignment.patientId === patientId);
    },

    getAssignmentById: (id: string) => {
      return get().assignments.find(assignment => assignment.id === id);
    },

    updateAssignmentStatus: (id: string, status: 'assigned' | 'pending' | 'completed', completedDate?: Date) => {
      set(state => {
        const assignment = state.assignments.find(a => a.id === id);
        if (assignment) {
          assignment.status = status;
          if (completedDate && status === 'completed') {
            assignment.completedDate = completedDate;
          }
        }
      });
    },

    // Implementación de acciones para respuestas
    saveResponse: (assignmentId: string, questionId: string, answer: string | string[] | number | boolean) => {
      // Comprobar si ya existe una respuesta para esta pregunta
      const existingResponseIndex = get().responses.findIndex(
        r => r.assignmentId === assignmentId && r.questionId === questionId
      );
      
      set(state => {
        if (existingResponseIndex >= 0) {
          // Actualizar respuesta existente
          state.responses[existingResponseIndex].answer = answer;
          state.responses[existingResponseIndex].timestamp = new Date();
        } else {
          // Crear nueva respuesta
          state.responses.push({
            id: uuidv4(),
            assignmentId,
            questionId,
            answer,
            timestamp: new Date()
          });
        }
      });
    },

    getResponsesByAssignment: (assignmentId: string) => {
      return get().responses.filter(response => response.assignmentId === assignmentId);
    },

    getResponsesForPatient: (patientId: string) => {
      // Obtener todas las asignaciones de este paciente
      const patientAssignments = get().getPatientSurveyAssignments(patientId);
      
      // Para cada asignación, obtener sus respuestas
      return patientAssignments.map(assignment => ({
        assignment,
        responses: get().getResponsesByAssignment(assignment.id)
      }));
    }
  }))
);
