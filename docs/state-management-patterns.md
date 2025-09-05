# Guía de Manejo de Estado - Mejores Prácticas

## 🎯 Principio Fundamental: Single Source of Truth

El estado debe tener una única fuente de verdad. No duplicar datos del servidor en estado local.

## 📊 Arquitectura de Estado

### 1. Estado del Servidor (Server State)
**Herramienta:** React Query (@tanstack/react-query)
**Ubicación:** Hooks personalizados en `/hooks`

```typescript
// ✅ CORRECTO: Consumir directamente desde React Query
const { data: patients, isLoading, error } = usePatients();

// ❌ INCORRECTO: Duplicar en estado local
const [patients, setPatients] = useState([]);
useEffect(() => {
  fetchPatients().then(setPatients);
}, []);
```

### 2. Estado Local de UI (UI State)
**Herramienta:** useState de React
**Uso:** Estados efímeros que no persisten

Ejemplos válidos:
- Estados de modales/diálogos abiertos
- Valores de formularios antes de enviar
- Estados de hover/focus
- Tabs activas
- Colapsos de acordeón

```typescript
// ✅ CORRECTO: Estado efímero de UI
const [isModalOpen, setIsModalOpen] = useState(false);
const [activeTab, setActiveTab] = useState<TabType>('today');
```

### 3. Estado Global de UI (Global UI State)
**Herramienta:** Context API o Zustand (si es necesario)
**Uso:** Estado de UI compartido entre componentes no relacionados

## 🚫 Anti-Patrones a Evitar

### 1. Duplicación de Estado del Servidor

```typescript
// ❌ ANTI-PATRÓN: Sincronización manual
const { data } = useQuery();
const [localData, setLocalData] = useState(data);

useEffect(() => {
  setLocalData(data);
}, [data]);
```

**Solución:**
```typescript
// ✅ CORRECTO: Usar directamente
const { data } = useQuery();
// Usar 'data' directamente en el render
```

### 2. Debounce con Estado Duplicado

```typescript
// ❌ ANTI-PATRÓN: Estado local para debounce
const [searchInput, setSearchInput] = useState(search);
const [debouncedSearch, setDebouncedSearch] = useState(search);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchInput);
  }, 300);
  return () => clearTimeout(timer);
}, [searchInput]);
```

**Solución:**
```typescript
// ✅ CORRECTO: Usar ref para debounce
const searchTimeoutRef = useRef<NodeJS.Timeout>();

const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
  const newValue = e.target.value;
  
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }
  
  searchTimeoutRef.current = setTimeout(() => {
    updateSearch(newValue); // Actualizar el estado real
  }, 300);
}, [updateSearch]);
```

### 3. Prop Drilling Excesivo

```typescript
// ❌ ANTI-PATRÓN: Pasar props por múltiples niveles
<Parent data={data}>
  <Child data={data}>
    <GrandChild data={data}>
      <GreatGrandChild data={data} />
    </GrandChild>
  </Child>
</Parent>
```

**Solución:**
```typescript
// ✅ CORRECTO: Usar Context o composición
const DataContext = createContext();

<DataContext.Provider value={data}>
  <Parent>
    <Child>
      <GrandChild>
        <GreatGrandChild /> {/* Consume del context */}
      </GrandChild>
    </Child>
  </Parent>
</DataContext.Provider>
```

## 🔄 Patrones de React Query

### 1. Configuración Consistente

```typescript
// hooks/use-patients.ts
export const usePatients = (filters?: PatientFilters) => {
  return useQuery({
    queryKey: queryKeys.patients.filtered(filters),
    queryFn: () => fetchPatients(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,    // 5 minutos
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
```

### 2. Manejo de Estados

```typescript
// Componente que consume el hook
const PatientList = () => {
  const { data, isLoading, error, isError } = usePatients();
  
  // Estados de carga
  if (isLoading && !data) {
    return <LoadingSkeleton />;
  }
  
  // Estados de error
  if (isError) {
    return <ErrorState error={error} />;
  }
  
  // Estado vacío
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  
  // Render normal
  return <PatientTable patients={data} />;
};
```

### 3. Actualizaciones Optimistas

```typescript
const updatePatientStatus = useMutation({
  mutationFn: updateStatus,
  onMutate: async (newData) => {
    // Cancelar queries en vuelo
    await queryClient.cancelQueries({ queryKey: queryKeys.patients.all });
    
    // Snapshot del estado previo
    const previousPatients = queryClient.getQueryData(queryKeys.patients.all);
    
    // Actualización optimista
    queryClient.setQueryData(queryKeys.patients.all, old => {
      return updatePatientInList(old, newData);
    });
    
    return { previousPatients };
  },
  onError: (err, newData, context) => {
    // Rollback en caso de error
    queryClient.setQueryData(queryKeys.patients.all, context.previousPatients);
  },
  onSettled: () => {
    // Revalidar después de mutación
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
  },
});
```

## 📝 Checklist de Refactorización

Cuando refactorices un componente, verifica:

- [ ] ¿Hay useState que duplica datos del servidor?
- [ ] ¿Hay useEffect que sincroniza estado local con React Query?
- [ ] ¿Los datos del servidor se consumen directamente de React Query?
- [ ] ¿El estado local se limita a UI efímera?
- [ ] ¿Se usa debounce sin duplicar estado?
- [ ] ¿Se evita prop drilling excesivo?
- [ ] ¿Los estados de carga/error se manejan consistentemente?
- [ ] ¿Las mutaciones invalidan las queries correctas?

## 🎨 Ejemplos de Implementación

### Búsqueda con Debounce (Sin Duplicación)

```typescript
const SearchableList = () => {
  const [search, setSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Query con el valor del estado
  const { data, isLoading } = useItems({ search });
  
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce de 300ms
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(newValue);
    }, 300);
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <>
      <Input
        defaultValue={search}
        onChange={handleSearchChange}
        placeholder="Buscar..."
      />
      {isLoading ? <Spinner /> : <ItemList items={data} />}
    </>
  );
};
```

### Modal con Estado Local

```typescript
const PatientActions = ({ patient }) => {
  // ✅ Estado local para UI efímera
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // ✅ Mutation para actualizar
  const updateMutation = useUpdatePatient();
  
  const handleSave = (updates) => {
    updateMutation.mutate(
      { id: patient.id, ...updates },
      {
        onSuccess: () => {
          setIsEditModalOpen(false); // Cerrar modal al guardar
        }
      }
    );
  };
  
  return (
    <>
      <Button onClick={() => setIsEditModalOpen(true)}>
        Editar
      </Button>
      
      {isEditModalOpen && (
        <EditPatientModal
          patient={patient} // No duplicar, pasar referencia
          onSave={handleSave}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </>
  );
};
```

## 🔍 Herramientas de Debug

### React Query DevTools

```typescript
// En el layout principal
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function RootLayout({ children }) {
  return (
    <>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### Custom Hook para Debug

```typescript
const useDebugRenders = (componentName: string, props?: any) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`[${componentName}] Render #${renderCount.current}`, props);
  });
};
```

## 📚 Referencias

- [React Query Documentation](https://tanstack.com/query/latest)
- [React Patterns](https://reactpatterns.com/)
- [Kent C. Dodds - State Colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)
