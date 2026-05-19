-- Fix the admin update policy to prevent recursion issues
-- First, drop the existing policy if it exists
drop policy if exists "Admins can update all profiles" on public.profiles;

-- Create a new policy using a different approach to avoid recursion
create policy "Admins can update all profiles" 
  on public.profiles for update 
  to authenticated
  using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.is_admin = true
    )
  );

-- Also verify the admin has a valid profile
select id, name, is_admin, status from profiles where id = 'cfb3a7e0-4c19-4b3e-af6c-344201a271d9';
