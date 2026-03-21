
create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references public.parties(id) not null,
  election_year integer not null,
  status text not null default 'pending',
  progress_pct integer default 0,
  total_chunks integer default 0,
  completed_chunks integer default 0,
  result_count integer default 0,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.analysis_jobs enable row level security;

create policy "Admins can manage analysis_jobs"
  on public.analysis_jobs
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Also allow service role (edge functions) to update via admin client
-- RLS is bypassed by service role key already, so no extra policy needed.
