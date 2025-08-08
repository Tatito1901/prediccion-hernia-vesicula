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
import { NewLeadForm } from '@/components/leads/new-lead-form';
import { LeadStats } from '@/components/leads/lead-stats';
import { useLeads, useLeadStats } from '@/hooks/use-leads';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { ClinicDataProvider } from '@/contexts/clinic-data-provider';
import type { LeadStatus, Channel, Motive } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'NUEVO', label: 'Nuevo', color: 'bg-blue-500' },
  { value: 'CONTACTADO', label: 'Contactado', color: 'bg-yellow-500' },
  { value: 'SEGUIMIENTO_PENDIENTE', label: 'En Seguimiento', color: 'bg-orange-500' },
  { value: 'CONVERTIDO', label: 'Convertido', color: 'bg-emerald-500' },
  { value: 'NO_INTERESADO', label: 'No Interesado', color: 'bg-red-500' },
  { value: 'PERDIDO', label: 'Perdido', color: 'bg-gray-500' },
  { value: 'CITA_AGENDADA', label: 'Cita Agendada', color: 'bg-green-500' },
];

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'PHONE_CALL', label: 'Teléfono' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SOCIAL_MEDIA', label: 'Redes Sociales' },
  { value: 'REFERRAL', label: 'Referido' },
  { value: 'WEBSITE', label: 'Sitio Web' },
  { value: 'WALK_IN', label: 'Visita Directa' },
];

const MOTIVE_OPTIONS: { value: Motive; label: string }[] = [
  { value: 'INFORMES', label: 'Informes' },
  { value: 'AGENDAR_CITA', label: 'Agendar Cita' },
  { value: 'URGENCIA_MEDICA', label: 'Urgencia Médica' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
  { value: 'CANCELACION', label: 'Cancelación' },
  { value: 'REAGENDAMIENTO', label: 'Reagendamiento' },
  { value: 'OTRO', label: 'Otro' },
];

function LeadsContent() {
  const [activeTab, setActiveTab] = useState<'resumen' | 'listado'>('resumen');
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
    enabled: activeTab === 'listado',
  });

  const { data: stats } = useLeadStats({ enabled: activeTab === 'resumen' });

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
        
        <NewLeadForm 
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lead
            </Button>
          }
          onSuccess={() => setIsNewLeadOpen(false)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'resumen' | 'listado')}>
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="listado">Listado</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          {stats ? (
            <LeadStats stats={stats} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <CardHeader>
                    <CardTitle className="h-4 w-24 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-6 w-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="listado" className="mt-4 space-y-6">
          {/* Filtros */}
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
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Channel Filter */}
                <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as Channel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Motive Filter */}
                <Select value={motiveFilter} onValueChange={(value) => setMotiveFilter(value as Motive)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVE_OPTIONS.map((motive) => (
                      <SelectItem key={motive.value} value={motive.value}>
                        {motive.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Filters */}
              <div className="flex items-center gap-4 mt-4">
                <Button
                  variant={showOverdue ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowOverdue(!showOverdue)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Solo Vencidos
                </Button>

                {hasFilters && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={clearFilters}>
                    Limpiar filtros
                  </Badge>
                )}
              </div>

              {/* Active Filters */}
              {hasFilters && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {statusFilter && (
                    <Badge variant="secondary">
                      Estado: {LEAD_STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
                    </Badge>
                  )}
                  {channelFilter && (
                    <Badge variant="secondary">
                      Canal: {CHANNEL_OPTIONS.find((c) => c.value === channelFilter)?.label}
                    </Badge>
                  )}
                  {motiveFilter && (
                    <Badge variant="secondary">
                      Motivo: {MOTIVE_OPTIONS.find((m) => m.value === motiveFilter)?.label}
                    </Badge>
                  )}
                  {showOverdue && <Badge variant="secondary">Solo Vencidos</Badge>}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <ClinicDataProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <LeadsContent />
        </SidebarInset>
      </SidebarProvider>
    </ClinicDataProvider>
  );
}
