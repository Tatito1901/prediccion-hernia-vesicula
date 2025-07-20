-- sql/enriched_appointments_rpc.sql
-- Función RPC optimizada para obtener citas enriquecidas con datos del paciente y doctor
-- Reemplaza el enriquecimiento que se hacía en el cliente

CREATE OR REPLACE FUNCTION get_enriched_appointments(
  p_date_filter TEXT DEFAULT NULL, -- 'today', 'future', 'past', NULL para todas
  p_status_filter TEXT DEFAULT NULL, -- filtro por estado específico
  p_patient_id UUID DEFAULT NULL, -- filtro por paciente específico
  p_doctor_id UUID DEFAULT NULL, -- filtro por doctor específico
  p_start_date DATE DEFAULT NULL, -- rango de fechas inicio
  p_end_date DATE DEFAULT NULL, -- rango de fechas fin
  p_search_term TEXT DEFAULT NULL, -- búsqueda por nombre de paciente
  p_page_num INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_date_condition TEXT;
  v_base_query TEXT;
  v_count_query TEXT;
  v_final_query TEXT;
  v_result JSON;
BEGIN
  -- Calcular offset para paginación
  v_offset := (p_page_num - 1) * p_page_size;
  
  -- Construir condición de fecha dinámica
  v_date_condition := CASE 
    WHEN p_date_filter = 'today' THEN 
      'AND DATE(a.fecha_hora_cita) = CURRENT_DATE'
    WHEN p_date_filter = 'future' THEN 
      'AND a.fecha_hora_cita > NOW()'
    WHEN p_date_filter = 'past' THEN 
      'AND a.fecha_hora_cita < NOW()'
    WHEN p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
      FORMAT('AND DATE(a.fecha_hora_cita) BETWEEN %L AND %L', p_start_date, p_end_date)
    ELSE ''
  END;

  -- Query base con JOIN optimizado
  v_base_query := FORMAT('
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    LEFT JOIN patient_surveys ps ON p.id = ps.patient_id
    WHERE 1=1
    %s
    %s
    %s
    %s
    %s
    %s
  ',
    v_date_condition,
    CASE WHEN p_status_filter IS NOT NULL THEN FORMAT('AND a.estado_cita = %L', p_status_filter) ELSE '' END,
    CASE WHEN p_patient_id IS NOT NULL THEN FORMAT('AND a.patient_id = %L', p_patient_id) ELSE '' END,
    CASE WHEN p_doctor_id IS NOT NULL THEN FORMAT('AND a.doctor_id = %L', p_doctor_id) ELSE '' END,
    CASE WHEN p_search_term IS NOT NULL THEN 
      FORMAT('AND (p.nombre ILIKE %L OR p.apellidos ILIKE %L)', 
             '%' || p_search_term || '%', 
             '%' || p_search_term || '%') 
    ELSE '' END,
    'AND a.deleted_at IS NULL AND p.deleted_at IS NULL'
  );

  -- Obtener conteo total
  v_count_query := 'SELECT COUNT(*) ' || v_base_query;
  EXECUTE v_count_query INTO v_total_count;

  -- Query final con datos enriquecidos
  v_final_query := FORMAT('
    SELECT json_build_object(
      ''data'', COALESCE(json_agg(
        json_build_object(
          ''id'', a.id,
          ''patient_id'', a.patient_id,
          ''doctor_id'', a.doctor_id,
          ''fecha_hora_cita'', a.fecha_hora_cita,
          ''motivo_cita'', a.motivo_cita,
          ''estado_cita'', a.estado_cita,
          ''notas_cita_seguimiento'', a.notas_cita_seguimiento,
          ''es_primera_vez'', a.es_primera_vez,
          ''created_at'', a.created_at,
          ''updated_at'', a.updated_at,
          -- Datos enriquecidos del paciente
          ''paciente'', json_build_object(
            ''id'', p.id,
            ''nombre'', p.nombre,
            ''apellidos'', p.apellidos,
            ''nombreCompleto'', CONCAT(COALESCE(p.nombre, ''''), '' '', COALESCE(p.apellidos, '''')),
            ''telefono'', p.telefono,
            ''email'', p.email,
            ''fecha_nacimiento'', p.fecha_nacimiento,
            ''diagnostico_principal'', p.diagnostico_principal,
            ''displayDiagnostico'', COALESCE(p.diagnostico_principal, ''Sin diagnóstico''),
            ''encuesta_completada'', (ps.id IS NOT NULL),
            ''estado'', p.estado
          ),
          -- Datos enriquecidos del doctor
          ''doctor'', CASE 
            WHEN d.id IS NOT NULL THEN json_build_object(
              ''id'', d.id,
              ''full_name'', d.full_name,
              ''especialidad'', d.especialidad
            )
            ELSE NULL
          END,
          -- Clasificación automática de fecha
          ''date_classification'', CASE
            WHEN DATE(a.fecha_hora_cita) = CURRENT_DATE THEN ''today''
            WHEN a.fecha_hora_cita > NOW() THEN ''future''
            ELSE ''past''
          END,
          -- Información adicional útil
          ''is_today'', (DATE(a.fecha_hora_cita) = CURRENT_DATE),
          ''is_future'', (a.fecha_hora_cita > NOW()),
          ''is_past'', (a.fecha_hora_cita < NOW()),
          ''days_until_appointment'', EXTRACT(DAY FROM (DATE(a.fecha_hora_cita) - CURRENT_DATE))
        )
        ORDER BY a.fecha_hora_cita DESC
      ), ''[]''::json),
      ''pagination'', json_build_object(
        ''page'', %s,
        ''pageSize'', %s,
        ''total'', %s,
        ''totalPages'', CEIL(%s::FLOAT / %s),
        ''hasMore'', (%s + %s) < %s
      ),
      ''summary'', json_build_object(
        ''total_appointments'', %s,
        ''today_count'', (
          SELECT COUNT(*) FROM appointments a2 
          LEFT JOIN patients p2 ON a2.patient_id = p2.id
          WHERE DATE(a2.fecha_hora_cita) = CURRENT_DATE 
          AND a2.deleted_at IS NULL AND p2.deleted_at IS NULL
        ),
        ''future_count'', (
          SELECT COUNT(*) FROM appointments a3 
          LEFT JOIN patients p3 ON a3.patient_id = p3.id
          WHERE a3.fecha_hora_cita > NOW() 
          AND a3.deleted_at IS NULL AND p3.deleted_at IS NULL
        ),
        ''past_count'', (
          SELECT COUNT(*) FROM appointments a4 
          LEFT JOIN patients p4 ON a4.patient_id = p4.id
          WHERE a4.fecha_hora_cita < NOW() 
          AND a4.deleted_at IS NULL AND p4.deleted_at IS NULL
        )
      )
    )
    %s
    ORDER BY a.fecha_hora_cita DESC
    LIMIT %s OFFSET %s
  ', 
    p_page_num, p_page_size, v_total_count, v_total_count, p_page_size,
    v_offset, p_page_size, v_total_count,
    v_total_count,
    v_base_query, p_page_size, v_offset
  );

  -- Ejecutar query final
  EXECUTE v_final_query INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Crear índices para optimizar performance
CREATE INDEX IF NOT EXISTS idx_appointments_fecha_hora_cita ON appointments(fecha_hora_cita);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_estado_cita ON appointments(estado_cita);
CREATE INDEX IF NOT EXISTS idx_patients_nombre_apellidos ON patients(nombre, apellidos);
CREATE INDEX IF NOT EXISTS idx_appointments_composite ON appointments(fecha_hora_cita, estado_cita, patient_id) WHERE deleted_at IS NULL;

-- Comentarios para documentación
COMMENT ON FUNCTION get_enriched_appointments IS 'Función RPC optimizada que retorna citas enriquecidas con datos del paciente y doctor, incluyendo clasificación automática por fecha y estadísticas de resumen. Reemplaza el enriquecimiento que se hacía en el cliente.';
