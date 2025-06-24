#!/bin/bash

# Script para probar los endpoints de la API
# Ejecutar con: bash test-api-endpoints.sh

# URL base (ajusta según sea necesario)
BASE_URL="http://localhost:3000/api"
HEADER="Content-Type: application/json"

# Colores para mejor legibilidad
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE}             PRUEBA DE ENDPOINTS DE API              ${NC}"
echo -e "${BLUE}======================================================${NC}\n"

# Función para probar endpoints
test_endpoint() {
    local method=$1
    local endpoint=$2
    local payload=$3
    local description=$4

    echo -e "\n${YELLOW}Probando: $description${NC}"
    echo -e "${BLUE}$method $endpoint${NC}"
    
    if [ -z "$payload" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" -H "$HEADER")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" -H "$HEADER" -d "$payload")
    fi
    
    # Verificar si la respuesta es un JSON válido
    if echo "$response" | jq '.' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Endpoint funcionando${NC}"
        echo -e "Respuesta (primeros 200 caracteres):\n${response:0:200}...\n"
    else
        echo -e "${RED}✗ Error: Respuesta no es JSON válido${NC}"
        echo -e "Respuesta:\n${response}\n"
    fi
}

# Para configurar una ID de prueba
echo -e "${YELLOW}Para realizar pruebas completas, necesitas IDs válidos.${NC}"
read -p "ID de un paciente existente para pruebas: " PATIENT_ID
read -p "ID de una cita existente para pruebas: " APPOINTMENT_ID

# 1. Probar endpoints de patients
echo -e "\n${BLUE}====================== PACIENTES ======================${NC}"
test_endpoint "GET" "/patients" "" "Listar todos los pacientes"
test_endpoint "GET" "/patients?estado=PENDIENTE_DE_CONSULTA" "" "Filtrar pacientes por estado"

if [ -n "$PATIENT_ID" ]; then
    test_endpoint "GET" "/patients/$PATIENT_ID" "" "Obtener paciente por ID"
    
    echo -e "\n${YELLOW}¿Deseas probar la actualización de un paciente? (s/n)${NC}"
    read TEST_PATCH
    if [ "$TEST_PATCH" = "s" ]; then
        test_endpoint "PATCH" "/patients/$PATIENT_ID" '{"comentarios_registro": "Actualización desde prueba API"}' "Actualizar paciente"
    fi
    
    echo -e "\n${YELLOW}¿Deseas probar la eliminación de un paciente? (s/n)${NC}"
    echo -e "${RED}CUIDADO: Esto eliminará permanentemente el paciente${NC}"
    read TEST_DELETE
    if [ "$TEST_DELETE" = "s" ]; then
        test_endpoint "DELETE" "/patients/$PATIENT_ID" "" "Eliminar paciente"
    fi
fi

# 2. Probar endpoints de appointments
echo -e "\n${BLUE}======================= CITAS =======================${NC}"
test_endpoint "GET" "/appointments" "" "Listar todas las citas"
test_endpoint "GET" "/appointments?estado=PROGRAMADA" "" "Filtrar citas por estado"

if [ -n "$APPOINTMENT_ID" ]; then
    test_endpoint "GET" "/appointments/$APPOINTMENT_ID" "" "Obtener cita por ID"
    
    echo -e "\n${YELLOW}¿Deseas probar la actualización de una cita? (s/n)${NC}"
    read TEST_PUT
    if [ "$TEST_PUT" = "s" ]; then
        test_endpoint "PUT" "/appointments/$APPOINTMENT_ID" '{"estado_cita": "CONFIRMADA"}' "Actualizar cita"
    fi
    
    echo -e "\n${YELLOW}¿Deseas probar la eliminación de una cita? (s/n)${NC}"
    echo -e "${RED}CUIDADO: Esto eliminará permanentemente la cita${NC}"
    read TEST_DELETE
    if [ "$TEST_DELETE" = "s" ]; then
        test_endpoint "DELETE" "/appointments/$APPOINTMENT_ID" "" "Eliminar cita"
    fi
fi

# 3. Probar assign-survey
echo -e "\n${BLUE}=================== ASSIGN SURVEY ===================${NC}"
if [ -n "$PATIENT_ID" ]; then
    echo -e "\n${YELLOW}¿Deseas probar la asignación de una encuesta? (s/n)${NC}"
    read TEST_ASSIGN
    if [ "$TEST_ASSIGN" = "s" ]; then
        test_endpoint "POST" "/assign-survey" "{\"patientId\": \"$PATIENT_ID\", \"templateId\": 1}" "Asignar encuesta"
    fi
fi

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE}             FIN DE PRUEBAS DE API                   ${NC}"
echo -e "${BLUE}======================================================${NC}\n"
