-- Create linked_cards table for storing user-linked cards
CREATE TABLE IF NOT EXISTS public.linked_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  card_holder TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  cvv TEXT NOT NULL,
  card_type TEXT DEFAULT 'visa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_linked_cards_user_id ON public.linked_cards(user_id);

-- Enable RLS
ALTER TABLE public.linked_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own cards
CREATE POLICY "Users can view own linked cards"
  ON public.linked_cards
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own cards
CREATE POLICY "Users can insert own linked cards"
  ON public.linked_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own cards
CREATE POLICY "Users can update own linked cards"
  ON public.linked_cards
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can only delete their own cards
CREATE POLICY "Users can delete own linked cards"
  ON public.linked_cards
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all linked cards
CREATE POLICY "Admins can view all linked cards"
  ON public.linked_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_linked_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS linked_cards_updated_at ON public.linked_cards;
CREATE TRIGGER linked_cards_updated_at
  BEFORE UPDATE ON public.linked_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_linked_cards_updated_at();
