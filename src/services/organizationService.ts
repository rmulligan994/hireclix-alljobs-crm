import { supabase } from '@/integrations/supabase/client';
import type { WebflowFieldMapping } from '@/config/webflowJobMapping';

export interface OrganizationSettings {
  id: string;
  company_name: string | null;
  brand_name: string | null;
  base_url: string | null;
  webflow_site_id: string | null;
  webflow_collection_id: string | null;
  webflow_api_token: string | null;
  webflow_job_field_mapping: WebflowFieldMapping | null;
  career_site_base_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateOrganizationSettingsInput {
  company_name?: string | null;
  brand_name?: string | null;
  base_url?: string | null;
  webflow_site_id?: string | null;
  webflow_collection_id?: string | null;
  webflow_api_token?: string | null;
  webflow_job_field_mapping?: WebflowFieldMapping | null;
  career_site_base_url?: string | null;
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
    if (input.webflow_site_id !== undefined) updateData.webflow_site_id = input.webflow_site_id;
    if (input.webflow_collection_id !== undefined) updateData.webflow_collection_id = input.webflow_collection_id;
    if (input.webflow_api_token !== undefined) updateData.webflow_api_token = input.webflow_api_token;
    if (input.webflow_job_field_mapping !== undefined) updateData.webflow_job_field_mapping = input.webflow_job_field_mapping;
    if (input.career_site_base_url !== undefined) updateData.career_site_base_url = input.career_site_base_url;

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
