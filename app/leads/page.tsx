'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Users, TrendingUp, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LeadsTable } from '@/components/leads/leads-table';
import { LeadModal } from '@/components/leads/lead-modal';
import { LeadStats } from '@/components/leads/lead-stats';
import { useLeads, useLeadStats } from '@/hooks/use-leads';
import type { LeadStatus, Channel, Motive } from '@/lib/types';

const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'NUEVO', label: 'Nuevo', color: 'bg-blue-500' },
  { value: 'CONTACTADO', label: 'Contactado', color: 'bg-yellow-500' },
  { value: 'EN_SEGUIMIENTO', label: 'En Seguimiento', color: 'bg-orange-500' },
  { value: 'INTERESADO', label: 'Interesado', color: 'bg-green-500' },
  { value: 'NO_INTERESADO', label: 'No Interesado', color: 'bg-red-500' },
  { value: 'CONVERTIDO', label: 'Convertido', color: 'bg-emerald-500' },
  { value: 'PERDIDO', label: 'Perdido', color: 'bg-gray-500' },
];

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'TELEFONO', label: 'Teléfono' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'REDES_SOCIALES', label: 'Redes Sociales' },
  { value: 'REFERIDO', label: 'Referido' },
  { value: 'SITIO_WEB', label: 'Sitio Web' },
  { value: 'WALK_IN', label: 'Visita Directa' },
];

const MOTIVE_OPTIONS: { value: Motive; label: string }[] = [
  { value: 'HERNIA_INGUINAL', label: 'Hernia Inguinal' },
  { value: 'HERNIA_UMBILICAL', label: 'Hernia Umbilical' },
  { value: 'VESICULA', label: 'Vesícula' },
  { value: 'CONSULTA_GENERAL', label: 'Consulta General' },
  { value: 'SEGUNDA_OPINION', label: 'Segunda Opinión' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
];

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>();
  const [channelFilter, setChannelFilter] = useState<Channel | undefined>();
  const [motiveFilter, setMotiveFilter] = useState<Motive | undefined>();
  const [showOverdue, setShowOverdue] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  const { data: leadsData, isLoading, error } = useLeads({
    page,
    search,
    status: statusFilter,
    channel: channelFilter,
    motive: motiveFilter,
    overdue: showOverdue,
  });

  const { data: stats } = useLeadStats();

  const clearFilters = () => {
    setStatusFilter(undefined);
    setChannelFilter(undefined);
    setMotiveFilter(undefined);
    setShowOverdue(false);
    setSearch('');
    setPage(1);
  };

  const hasFilters = statusFilter || channelFilter || motiveFilter || showOverdue || search;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Leads</h1>
          <p className="text-muted-foreground">
            Administra tus prospectos y convierte leads en pacientes
          </p>
        </div>
        
        <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Lead</DialogTitle>
            </DialogHeader>
            <NewLeadForm 
              onSuccess={() => setIsNewLeadOpen(false)}
              channelOptions={CHANNEL_OPTIONS}
              motiveOptions={MOTIVE_OPTIONS}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && <LeadStats stats={stats} />}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeadStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Channel Filter */}
            <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as Channel)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por canal" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Motive Filter */}
            <Select value={motiveFilter} onValueChange={(value) => setMotiveFilter(value as Motive)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Filters */}
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={showOverdue ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOverdue(!showOverdue)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Solo Vencidos
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
            )}
          </div>

          {/* Active Filters */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mt-4">
              {search && (
                <Badge variant="secondary">
                  Búsqueda: {search}
                </Badge>
              )}
              {statusFilter && (
                <Badge variant="secondary">
                  Estado: {LEAD_STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}
                </Badge>
              )}
              {channelFilter && (
                <Badge variant="secondary">
                  Canal: {CHANNEL_OPTIONS.find(c => c.value === channelFilter)?.label}
                </Badge>
              )}
              {motiveFilter && (
                <Badge variant="secondary">
                  Motivo: {MOTIVE_OPTIONS.find(m => m.value === motiveFilter)?.label}
                </Badge>
              )}
              {showOverdue && (
                <Badge variant="secondary">
                  Solo Vencidos
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <LeadsTable 
        data={leadsData}
        isLoading={isLoading}
        error={error}
        page={page}
        onPageChange={setPage}
        statusOptions={LEAD_STATUS_OPTIONS}
        channelOptions={CHANNEL_OPTIONS}
        motiveOptions={MOTIVE_OPTIONS}
      />
    </div>
  );
}
