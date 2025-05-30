
import React, { useState, useMemo, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/tables/table-skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  MoreHorizontal,
  Edit,
  Share2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Eye,
  CalendarDays,
  Filter,
  BriefcaseMedical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PatientData } from "@/app/dashboard/data-model";

interface PatientTableProps {
  patients: PatientData[];
  loading?: boolean;
  onSelectPatient: (patient: PatientData) => void;
  onShareSurvey?: (patient: PatientData) => void;
  onAnswerSurvey?: (patient: PatientData) => void;
  onEditPatient?: (patient: PatientData) => void;
}

// Sólo los campos que podamos ordenar
type SortKey = keyof Pick<
  PatientData,
  "nombre" | "fechaConsulta" | "diagnostico" | "estado" | "encuesta" | "timestampRegistro"
>;

type SortDirection = "asc" | "desc";
interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

// Configuración declarativa de columnas
interface Column<T> {
  key: SortKey | "actions";
  label: string;
  widthClass?: string;
  hideBelow?: "md" | "lg";
  align?: "left" | "center" | "right";
  renderCell?: (item: T) => ReactNode;
}

export const PatientTable: React.FC<PatientTableProps> = React.memo(
  ({
    patients,
    loading = false,
    onSelectPatient,
    onShareSurvey,
    onAnswerSurvey,
    onEditPatient,
  }) => {
    const router = useRouter();

    // Estados de búsqueda, filtro y orden
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<PatientData["estado"] | "all">("all");
    const [sortConfig, setSortConfig] = useState<SortConfig>({
      key: "timestampRegistro",
      direction: "desc",
    });

    // Handler de orden
    const toggleSort = useCallback((key: SortKey) => {
      setSortConfig((prev) => ({
        key,
        direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
      }));
    }, []);

    // Badge de estado
    const getStatusBadge = useCallback((status: PatientData["estado"]) => {
      switch (status) {
        case "Operado":
          return {
            className:
              "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700",
            icon: <CheckCircle2 className="h-3 w-3" />,
            label: "Operado",
          };
        case "No Operado":
          return {
            className:
              "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
            icon: <AlertCircle className="h-3 w-3" />,
            label: "No Operado",
          };
        case "Pendiente de consulta":
          return {
            className:
              "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700",
            icon: <BriefcaseMedical className="h-3 w-3" />,
            label: "Pendiente",
          };
        case "Seguimiento":
          return {
            className:
              "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-700",
            icon: <CalendarDays className="h-3 w-3" />,
            label: "Seguimiento",
          };
        default:
          return {
            className:
              "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600",
            icon: null,
            label: status,
          };
      }
    }, []);

    // Valores únicos de estado (para filtro)
    const statusOptions = useMemo<(PatientData["estado"] | "all")[]>(() => {
      const setEstados = new Set(patients.map((p) => p.estado));
      return ["all", ...setEstados];
    }, [patients]);

    // Filtrado y ordenamiento memoizados
    const processed = useMemo(() => {
      // 1) Filtrar por nombre y estado
      const filtered = patients.filter((p) => {
        const fullName = `${p.nombre} ${p.apellidos}`.toLowerCase();
        const matchesName = fullName.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || p.estado === statusFilter;
        return matchesName && matchesStatus;
      });

      // 2) Ordenar
      const { key, direction } = sortConfig;
      const asc = direction === "asc";
      return [...filtered].sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        // nulls al final en ascendente
        if (va == null && vb != null) return asc ? 1 : -1;
        if (va != null && vb == null) return asc ? -1 : 1;
        if (va == null && vb == null) return 0;
        // Fechas
        if (key === "fechaConsulta" || key === "timestampRegistro") {
          return asc
            ? new Date(va as string).getTime() - new Date(vb as string).getTime()
            : new Date(vb as string).getTime() - new Date(va as string).getTime();
        }
        // Booleano encuesta
        if (key === "encuesta") {
          const ba = Boolean(va), bb = Boolean(vb);
          if (ba === bb) return 0;
          return asc ? (ba ? 1 : -1) : (ba ? -1 : 1);
        }
        // Números
        if (typeof va === "number" && typeof vb === "number") {
          return asc ? va - vb : vb - va;
        }
        // Strings
        const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
        if (sa < sb) return asc ? -1 : 1;
        if (sa > sb) return asc ? 1 : -1;
        return 0;
      });
    }, [patients, searchTerm, statusFilter, sortConfig]);

    // Icono de orden para columna
    const SortIcon = useCallback(
      (col: SortKey) =>
        sortConfig.key !== col ? (
          <ChevronUp className="h-4 w-4 opacity-20 group-hover:opacity-50" />
        ) : sortConfig.direction === "asc" ? (
          <ChevronUp className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        ),
      [sortConfig]
    );

    // Definición de columnas
    const columns: Column<PatientData>[] = useMemo(
      () => [
        {
          key: "nombre",
          label: "Paciente",
          widthClass: "w-[220px] sm:w-[280px]",
          renderCell: (p) => (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="font-semibold">{p.nombre} {p.apellidos}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">
                {p.diagnostico ?? "Sin diagnóstico"}
              </span>
            </div>
          ),
        },
        {
          key: "fechaConsulta",
          label: "Próx. Consulta",
          hideBelow: "lg",
          renderCell: (p) =>
            p.fechaConsulta
              ? new Intl.DateTimeFormat("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(p.fechaConsulta))
              : "N/A",
        },
        {
          key: "diagnostico",
          label: "Diagnóstico",
          hideBelow: "md",
          renderCell: (p) => p.diagnostico ?? "Sin diagnóstico",
        },
        {
          key: "estado",
          label: "Estado",
          renderCell: (p) => {
            const cfg = getStatusBadge(p.estado);
            return (
              <Badge variant="outline" className={cn("text-xs font-medium py-1 px-2 rounded", cfg.className)}>
                {cfg.icon}
                {cfg.label}
              </Badge>
            );
          },
        },
        {
          key: "encuesta",
          label: "Encuesta",
          align: "center",
          renderCell: (p) => (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={p.encuesta ? "Ver resultados" : "Responder encuesta"}
                    onClick={() =>
                      p.encuesta
                        ? router.push(`/survey-results/${p.id}`)
                        : onAnswerSurvey?.(p)
                    }
                  >
                    {p.encuesta ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {p.encuesta ? "Resultados" : "Pendiente"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ),
        },
        {
          key: "actions",
          label: "Acciones",
          align: "right",
          renderCell: (p) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir menú"
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onSelectPatient(p)}>
                  <Eye className="mr-2 h-4 w-4" /> Ver ficha
                </DropdownMenuItem>
                {onEditPatient && (
                  <DropdownMenuItem onClick={() => onEditPatient(p)}>
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {p.encuesta && (
                  <DropdownMenuItem onClick={() => router.push(`/survey-results/${p.id}`)}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Resultados
                  </DropdownMenuItem>
                )}
                {!p.encuesta && onAnswerSurvey && (
                  <DropdownMenuItem onClick={() => onAnswerSurvey(p)}>
                    <ClipboardList className="mr-2 h-4 w-4" /> Responder
                  </DropdownMenuItem>
                )}
                {onShareSurvey && (
                  <DropdownMenuItem onClick={() => onShareSurvey(p)}>
                    <Share2 className="mr-2 h-4 w-4" /> Compartir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        },
      ],
      [getStatusBadge, onSelectPatient, onEditPatient, onAnswerSurvey, onShareSurvey, router]
    );

    if (loading) {
      return <TableSkeleton rows={7} columns={columns.length} className="m-4" />;
    }

    return (
      <div className="bg-white dark:bg-slate-950 shadow rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <Input
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 sm:max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as PatientData["estado"] | "all")}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((st) => (
                <SelectItem key={st} value={st} className="capitalize">
                  {st === "all" ? "Todos los estados" : st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-slate-600 dark:text-slate-400">
            {processed.length} paciente{processed.length !== 1 && "s"}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    onClick={
                      col.key !== "actions"
                        ? () => toggleSort(col.key as SortKey)
                        : undefined
                    }
                    className={cn(
                      "cursor-pointer select-none py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider",
                      col.widthClass,
                      col.hideBelow && `${col.hideBelow}:hidden`,
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{col.label}</span>
                      {col.key !== "actions" && <SortIcon key={col.key} />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
              {processed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                      <span className="font-medium">No se encontraron pacientes</span>
                      <small>Prueba otro término o ajusta filtros</small>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                processed.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        onClick={col.key !== "actions" ? () => onSelectPatient(p) : undefined}
                        className={cn(
                          "py-3 px-4 align-top",
                          col.widthClass,
                          col.hideBelow && `${col.hideBelow}:hidden`,
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                          "cursor-pointer"
                        )}
                      >
                        {col.renderCell ? col.renderCell(p) : (p[col.key as keyof PatientData] as ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
);

PatientTable.displayName = "PatientTable";
export default PatientTable;
