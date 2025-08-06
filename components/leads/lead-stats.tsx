
import { TrendingUp, Users, UserCheck, UserX, Phone, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { LeadStats as LeadStatsType, Channel, LeadStatus } from '@/lib/types';

interface LeadStatsProps {
  stats: LeadStatsType;
}

export function LeadStats({ stats }: LeadStatsProps) {
  // Channel icons mapping
  const getChannelIcon = (channel: Channel) => {
    switch (channel) {
      case 'TELEFONO':
        return <Phone className="h-4 w-4" />;
      case 'WHATSAPP':
        return <Phone className="h-4 w-4" />;
      case 'EMAIL':
        return <Phone className="h-4 w-4" />;
      case 'REDES_SOCIALES':
        return <Phone className="h-4 w-4" />;
      case 'REFERIDO':
        return <Users className="h-4 w-4" />;
      case 'SITIO_WEB':
        return <Phone className="h-4 w-4" />;
      case 'WALK_IN':
        return <Phone className="h-4 w-4" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  // Channel labels mapping
  const getChannelLabel = (channel: Channel) => {
    const labels: Record<Channel, string> = {
      'TELEFONO': 'Teléfono',
      'WHATSAPP': 'WhatsApp',
      'EMAIL': 'Email',
      'REDES_SOCIALES': 'Redes Sociales',
      'REFERIDO': 'Referido',
      'SITIO_WEB': 'Sitio Web',
      'WALK_IN': 'Visita Directa',
    };
    return labels[channel] || channel;
  };

  // Status labels and colors mapping
  const getStatusConfig = (status: LeadStatus) => {
    const configs: Record<LeadStatus, { label: string; color: string }> = {
      'NUEVO': { label: 'Nuevo', color: 'bg-blue-500' },
      'CONTACTADO': { label: 'Contactado', color: 'bg-yellow-500' },
      'EN_SEGUIMIENTO': { label: 'En Seguimiento', color: 'bg-orange-500' },
      'INTERESADO': { label: 'Interesado', color: 'bg-green-500' },
      'NO_INTERESADO': { label: 'No Interesado', color: 'bg-red-500' },
      'CONVERTIDO': { label: 'Convertido', color: 'bg-emerald-500' },
      'PERDIDO': { label: 'Perdido', color: 'bg-gray-500' },
    };
    return configs[status] || { label: status, color: 'bg-gray-500' };
  };

  // Get top channels
  const topChannels = Object.entries(stats.leads_by_channel)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_leads}</div>
          <p className="text-xs text-muted-foreground">
            Prospectos registrados
          </p>
        </CardContent>
      </Card>

      {/* New Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leads Nuevos</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.new_leads}</div>
          <p className="text-xs text-muted-foreground">
            Por contactar
          </p>
        </CardContent>
      </Card>

      {/* In Follow Up */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Seguimiento</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.in_follow_up}</div>
          <p className="text-xs text-muted-foreground">
            Seguimiento activo
          </p>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.conversion_rate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.converted_leads} convertidos
          </p>
        </CardContent>
      </Card>

      {/* Leads by Status */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Leads por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.leads_by_status).map(([status, count]) => {
              const statusConfig = getStatusConfig(status as LeadStatus);
              const percentage = stats.total_leads > 0 ? (count / stats.total_leads) * 100 : 0;
              
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusConfig.color}`} />
                      <span>{statusConfig.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{count}</span>
                      <Badge variant="secondary" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Channels */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Canales Principales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topChannels.map(([channel, count]) => {
              const percentage = stats.total_leads > 0 ? (count / stats.total_leads) * 100 : 0;
              
              return (
                <div key={channel} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(channel as Channel)}
                      <span>{getChannelLabel(channel as Channel)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{count}</span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
            
            {/* Show message if no data */}
            {topChannels.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Phone className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">No hay datos de canales disponibles</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions / Additional Info */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-base">Resumen de Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-600">{stats.new_leads}</p>
              <p className="text-sm text-muted-foreground">Nuevos</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-orange-600">{stats.in_follow_up}</p>
              <p className="text-sm text-muted-foreground">En Seguimiento</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">{stats.converted_leads}</p>
              <p className="text-sm text-muted-foreground">Convertidos</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-600">
                {stats.total_leads - stats.converted_leads - stats.new_leads - stats.in_follow_up}
              </p>
              <p className="text-sm text-muted-foreground">Otros Estados</p>
            </div>
          </div>

          {/* Conversion insights */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Eficiencia de conversión
              </span>
              <div className="flex items-center gap-2">
                <Progress 
                  value={stats.conversion_rate} 
                  className="w-20 h-2" 
                />
                <span className="font-medium">
                  {stats.conversion_rate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
