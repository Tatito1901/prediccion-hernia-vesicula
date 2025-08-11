import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { LeadStats, LeadStatus, Channel } from '@/lib/types';
import { LEAD_STATUS_VALUES, CONTACT_CHANNEL_VALUES } from '@/lib/validation/enums';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Require authenticated user context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: user not authenticated' },
        { status: 401 }
      );
    }

    // Helpers
    async function countAll() {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    }

    async function countByStatus(status: LeadStatus) {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      if (error) throw error;
      return count || 0;
    }

    async function countByChannel(channel: Channel) {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('channel', channel);
      if (error) throw error;
      return count || 0;
    }

    // Execute counts
    const [
      total_leads,
      leads_by_status_entries,
      leads_by_channel_entries,
    ] = await Promise.all([
      countAll(),
      Promise.all(
        (LEAD_STATUS_VALUES as readonly LeadStatus[]).map(async (s) => [s, await countByStatus(s)] as const)
      ),
      Promise.all(
        (CONTACT_CHANNEL_VALUES as readonly Channel[]).map(async (c) => [c, await countByChannel(c)] as const)
      ),
    ]);

    const leads_by_status = Object.fromEntries(leads_by_status_entries) as Record<LeadStatus, number>;
    const leads_by_channel = Object.fromEntries(leads_by_channel_entries) as Record<Channel, number>;

    const new_leads = leads_by_status['NUEVO'] ?? 0;
    const in_follow_up = leads_by_status['SEGUIMIENTO_PENDIENTE'] ?? 0;
    const converted_leads = leads_by_status['CONVERTIDO'] ?? 0;

    const conversion_rate = total_leads > 0 ? (converted_leads / total_leads) * 100 : 0;

    const stats: LeadStats = {
      total_leads,
      new_leads,
      in_follow_up,
      converted_leads,
      conversion_rate,
      leads_by_channel,
      leads_by_status,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error computing lead stats:', error);
    return NextResponse.json(
      { error: 'Error computing lead stats', details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
