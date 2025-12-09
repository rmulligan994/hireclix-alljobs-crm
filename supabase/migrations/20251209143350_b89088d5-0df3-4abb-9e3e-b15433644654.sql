-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  location TEXT,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  linkedin_url TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create pipelines table
CREATE TABLE public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  stages JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create talent_pools table
CREATE TABLE public.talent_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create pipeline_candidates junction table
CREATE TABLE public.pipeline_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(pipeline_id, candidate_id)
);

-- Create talent_pool_candidates junction table
CREATE TABLE public.talent_pool_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_pool_id UUID REFERENCES public.talent_pools(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(talent_pool_id, candidate_id)
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create communications table
CREATE TABLE public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'message')),
  subject TEXT,
  content TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for candidates (authenticated users can access all candidates)
CREATE POLICY "Authenticated users can view candidates" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update candidates" ON public.candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete candidates" ON public.candidates FOR DELETE TO authenticated USING (true);

-- RLS Policies for pipelines
CREATE POLICY "Authenticated users can view pipelines" ON public.pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create pipelines" ON public.pipelines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pipelines" ON public.pipelines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pipelines" ON public.pipelines FOR DELETE TO authenticated USING (true);

-- RLS Policies for talent_pools
CREATE POLICY "Authenticated users can view talent pools" ON public.talent_pools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create talent pools" ON public.talent_pools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update talent pools" ON public.talent_pools FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete talent pools" ON public.talent_pools FOR DELETE TO authenticated USING (true);

-- RLS Policies for pipeline_candidates
CREATE POLICY "Authenticated users can view pipeline candidates" ON public.pipeline_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add pipeline candidates" ON public.pipeline_candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pipeline candidates" ON public.pipeline_candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can remove pipeline candidates" ON public.pipeline_candidates FOR DELETE TO authenticated USING (true);

-- RLS Policies for talent_pool_candidates
CREATE POLICY "Authenticated users can view pool candidates" ON public.talent_pool_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add pool candidates" ON public.talent_pool_candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can remove pool candidates" ON public.talent_pool_candidates FOR DELETE TO authenticated USING (true);

-- RLS Policies for notes
CREATE POLICY "Authenticated users can view notes" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update their notes" ON public.notes FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Authenticated users can delete their notes" ON public.notes FOR DELETE TO authenticated USING (created_by = auth.uid());

-- RLS Policies for communications
CREATE POLICY "Authenticated users can view communications" ON public.communications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create communications" ON public.communications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update communications" ON public.communications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete communications" ON public.communications FOR DELETE TO authenticated USING (true);

-- Create function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON public.pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_talent_pools_updated_at BEFORE UPDATE ON public.talent_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pipeline_candidates_updated_at BEFORE UPDATE ON public.pipeline_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();