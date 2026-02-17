
-- Drop the overly restrictive select policy
DROP POLICY "No public read access" ON public.waitlist;

-- Allow anyone to read the count only (no email exposure since we use head:true / count)
-- But to be safe, create a function that returns count
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.waitlist;
$$;

-- Re-add select policy that blocks direct reads
CREATE POLICY "No public read access"
  ON public.waitlist FOR SELECT
  USING (false);
