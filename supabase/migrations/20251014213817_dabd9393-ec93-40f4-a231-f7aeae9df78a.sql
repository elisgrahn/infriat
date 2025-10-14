-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for promise status
CREATE TYPE promise_status AS ENUM ('kept', 'broken', 'in-progress', 'pending-analysis');

-- Create parties table
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create promises table
CREATE TABLE public.promises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  election_year INTEGER NOT NULL,
  promise_text TEXT NOT NULL,
  summary TEXT,
  direct_quote TEXT,
  measurability_reason TEXT,
  status promise_status NOT NULL DEFAULT 'pending-analysis',
  status_explanation TEXT,
  status_sources TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create status_suggestions table for community contributions
CREATE TABLE public.status_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promise_id UUID NOT NULL REFERENCES public.promises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_status promise_status NOT NULL,
  explanation TEXT NOT NULL,
  sources TEXT[],
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create votes table to track user votes on suggestions
CREATE TABLE public.suggestion_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID NOT NULL REFERENCES public.status_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(suggestion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parties (public read)
CREATE POLICY "Anyone can view parties" ON public.parties
  FOR SELECT USING (true);

-- RLS Policies for promises (public read)
CREATE POLICY "Anyone can view promises" ON public.promises
  FOR SELECT USING (true);

-- RLS Policies for status_suggestions
CREATE POLICY "Anyone can view suggestions" ON public.status_suggestions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create suggestions" ON public.status_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions" ON public.status_suggestions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for suggestion_votes
CREATE POLICY "Anyone can view votes" ON public.suggestion_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.suggestion_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON public.suggestion_votes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.suggestion_votes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_promises_party ON public.promises(party_id);
CREATE INDEX idx_promises_status ON public.promises(status);
CREATE INDEX idx_suggestions_promise ON public.status_suggestions(promise_id);
CREATE INDEX idx_votes_suggestion ON public.suggestion_votes(suggestion_id);

-- Insert common Swedish parties
INSERT INTO public.parties (name, abbreviation) VALUES
  ('Moderaterna', 'M'),
  ('Socialdemokraterna', 'S'),
  ('Sverigedemokraterna', 'SD'),
  ('Centerpartiet', 'C'),
  ('Vänsterpartiet', 'V'),
  ('Kristdemokraterna', 'KD'),
  ('Liberalerna', 'L'),
  ('Miljöpartiet', 'MP');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for promises updated_at
CREATE TRIGGER update_promises_updated_at
  BEFORE UPDATE ON public.promises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();