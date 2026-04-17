import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface EmailTemplate {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  subject: string | null;
  preheader: string | null;
  bee_json: Json | null;
  html_content: string | null;
  compose_kind?: string | null;
  form_payload?: Json | null;
  thumbnail_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailTemplateInput {
  name: string;
  category?: string;
  subject?: string;
  preheader?: string;
  bee_json?: Json | null;
  html_content?: string;
  compose_kind?: string | null;
  form_payload?: Json | null;
  thumbnail_url?: string;
}

export interface UpdateEmailTemplateInput {
  name?: string;
  category?: string;
  subject?: string;
  preheader?: string;
  bee_json?: Json | null;
  html_content?: string;
  compose_kind?: string | null;
  form_payload?: Json | null;
  thumbnail_url?: string;
}

export const emailTemplateService = {
  async getAll(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EmailTemplate[];
  },

  async getById(id: string): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as EmailTemplate | null;
  },

  async getByCategory(category: string): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EmailTemplate[];
  },

  async create(input: CreateEmailTemplateInput): Promise<EmailTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name: input.name,
        category: input.category || 'custom',
        subject: input.subject,
        preheader: input.preheader,
        bee_json: input.bee_json ?? null,
        html_content: input.html_content,
        compose_kind: input.compose_kind ?? null,
        form_payload: input.form_payload ?? null,
        thumbnail_url: input.thumbnail_url,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as EmailTemplate;
  },

  async update(id: string, input: UpdateEmailTemplateInput): Promise<EmailTemplate> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.category !== undefined) patch.category = input.category;
    if (input.subject !== undefined) patch.subject = input.subject;
    if (input.preheader !== undefined) patch.preheader = input.preheader;
    if (input.bee_json !== undefined) patch.bee_json = input.bee_json;
    if (input.html_content !== undefined) patch.html_content = input.html_content;
    if (input.compose_kind !== undefined) patch.compose_kind = input.compose_kind;
    if (input.form_payload !== undefined) patch.form_payload = input.form_payload;
    if (input.thumbnail_url !== undefined) patch.thumbnail_url = input.thumbnail_url;

    const { data, error } = await supabase
      .from('email_templates')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EmailTemplate;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async search(query: string): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .or(`name.ilike.%${query}%,subject.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EmailTemplate[];
  },
};
