import { supabase } from '@/integrations/supabase/client';

export interface OrganizationSettings {
  id: string;
  company_name: string | null;
  brand_name: string | null;
  base_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateOrganizationSettingsInput {
  company_name?: string | null;
  brand_name?: string | null;
  base_url?: string | null;
}

export const organizationService = {
  async get(): Promise<OrganizationSettings | null> {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows
      throw error;
    }
    return data as OrganizationSettings;
  },

  async update(input: UpdateOrganizationSettingsInput): Promise<OrganizationSettings> {
    const { data: existing } = await supabase
      .from('organization_settings')
      .select('id')
      .limit(1)
      .single();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.company_name !== undefined) updateData.company_name = input.company_name;
    if (input.brand_name !== undefined) updateData.brand_name = input.brand_name;
    if (input.base_url !== undefined) updateData.base_url = input.base_url;

    if (existing) {
      const { data, error } = await supabase
        .from('organization_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as OrganizationSettings;
    } else {
      const { data, error } = await supabase
        .from('organization_settings')
        .insert(updateData)
        .select()
        .single();
      if (error) throw error;
      return data as OrganizationSettings;
    }
  },
};
