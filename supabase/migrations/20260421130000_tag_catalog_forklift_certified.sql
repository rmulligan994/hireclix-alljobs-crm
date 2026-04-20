INSERT INTO public.tag_catalog (name)
SELECT 'Forklift Certified'
WHERE NOT EXISTS (
  SELECT 1 FROM public.tag_catalog tc WHERE lower(tc.name) = lower('Forklift Certified')
);
