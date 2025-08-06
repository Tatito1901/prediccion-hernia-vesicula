'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/unified-skeletons';
import { EditLeadForm } from './edit-lead-form';
import { useUpdateLead, useDeleteLead } from '@/hooks/use-leads';
import type { Lead, PaginatedResponse, LeadStatus, Channel, Motive } from '@/lib/types';

interface LeadsTableProps {
  data?: PaginatedResponse<Lead>;
  isLoading: boolean;
  error: Error | null;
  page: number;
  onPageChange: (page: number) => void;
  statusOptions: { value: LeadStatus; label: string; color: string }[];
  channelOptions: { value: Channel; label: string }[];
  motiveOptions: { value: Motive; label: string }[];
}

export function LeadsTable({
  data,
  isLoading,
  error,
  page,
  onPageChange,
  statusOptions,
  channelOptions,
  motiveOptions,
}: LeadsTableProps) {
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);

  const { mutate: updateLead } = useUpdateLead();
  const { mutate: deleteLead } = useDeleteLead();

  const getStatusBadge = (status: LeadStatus) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return <Badge variant="secondary">{status}</Badge>;

    return (
      <Badge 
        variant="secondary" 
        className={`${statusConfig.color} text-white`}
      >
        {statusConfig.label}
      </Badge>
    );
  };

  const getChannelLabel = (channel: Channel) => {
    return channelOptions.find(c => c.value === channel)?.label || channel;
  };

  const getMotiveLabel = (motive: Motive) => {
    return motiveOptions.find(m => m.value === motive)?.label || motive;
  };

  const calculateDaysAgo = (date: string) => {
    const now = new Date();
    const createdDate = new Date(date);
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const handleQuickStatusUpdate = (leadId: string, newStatus: LeadStatus) => {
    updateLead({
      id: leadId,
      data: { status: newStatus }
    });
  };

  const handleDeleteLead = () => {
    if (leadToDelete) {
      deleteLead(leadToDelete.id);
      setLeadToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando leads...</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="lg" message="Obteniendo lista de leads..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error al cargar leads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se encontraron leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay leads que coincidan con los filtros aplicados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Leads ({data.pagination.totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{lead.full_name}</p>
                          {lead.notes && (
                            <p className="text-sm text-muted-foreground truncate max-w-32">
                              {lead.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {lead.phone_number}
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {lead.email}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {getChannelLabel(lead.channel)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {getMotiveLabel(lead.motive)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(lead.status)}
                    </TableCell>

                    <TableCell>
                      {lead.next_follow_up_date ? (
                        <div className={`flex items-center gap-2 text-sm ${
                          isOverdue(lead.next_follow_up_date) 
                            ? 'text-red-600' 
                            : 'text-muted-foreground'
                        }`}>
                          {isOverdue(lead.next_follow_up_date) ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Calendar className="h-4 w-4" />
                          )}
                          {format(new Date(lead.next_follow_up_date), 'dd MMM', { locale: es })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin programar</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {lead.lead_intent || 'Sin especificar'}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {calculateDaysAgo(lead.created_at)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Quick Status Updates */}
                          {lead.status === 'NUEVO' && (
                            <DropdownMenuItem
                              onClick={() => handleQuickStatusUpdate(lead.id, 'CONTACTADO')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Marcar como Contactado
                            </DropdownMenuItem>
                          )}
                          
                          {lead.status === 'CONTACTADO' && (
                            <DropdownMenuItem
                              onClick={() => handleQuickStatusUpdate(lead.id, 'EN_SEGUIMIENTO')}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Poner en Seguimiento
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => setLeadToEdit(lead)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => setLeadToDelete(lead)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {data.data.length} de {data.pagination.totalCount} leads
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <div className="text-sm">
                  Página {page} de {data.pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= data.pagination.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Lead Dialog */}
      <Dialog open={!!leadToEdit} onOpenChange={() => setLeadToEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          {leadToEdit && (
            <EditLeadForm
              lead={leadToEdit}
              onSuccess={() => setLeadToEdit(null)}
              statusOptions={statusOptions}
              channelOptions={channelOptions}
              motiveOptions={motiveOptions}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!leadToDelete} onOpenChange={() => setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el lead
              <strong> {leadToDelete?.full_name}</strong> de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLead}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
