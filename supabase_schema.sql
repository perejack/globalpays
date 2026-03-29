-- SQL Schema for Flow Money App
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
alter table if exists public.users enable row level security;

-- Create users table extension
-- Note: Using Supabase Auth, profiles table for additional user data

-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  avatar text,
  balance decimal(12,2) default 0.00,
  status text default 'active',
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  last_active timestamp with time zone default timezone('utc'::text, now()),
  is_admin boolean default false,
  
  constraint valid_status check (status in ('active', 'suspended', 'pending'))
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create RLS policies for profiles
-- Users can read their own profile
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles" 
  on public.profiles for select 
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Admins can update all profiles
create policy "Admins can update all profiles" 
  on public.profiles for update 
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Create transactions table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  amount decimal(12,2) not null,
  type text not null,
  status text default 'completed',
  date text not null,
  timestamp bigint,
  category text default 'general',
  reference text,
  
  constraint valid_transaction_type check (type in ('sent', 'received')),
  constraint valid_transaction_status check (status in ('pending', 'completed', 'failed'))
);

-- Enable RLS on transactions
alter table public.transactions enable row level security;

-- Create RLS policies for transactions
-- Users can view their own transactions
create policy "Users can view own transactions" 
  on public.transactions for select 
  using (auth.uid() = user_id);

-- Users can insert their own transactions
create policy "Users can create own transactions" 
  on public.transactions for insert 
  with check (auth.uid() = user_id);

-- Admins can view all transactions
create policy "Admins can view all transactions" 
  on public.transactions for select 
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Admins can insert transactions for any user
create policy "Admins can create transactions" 
  on public.transactions for insert 
  with check (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Admins can update any transaction
create policy "Admins can update transactions" 
  on public.transactions for update 
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Admins can delete transactions
create policy "Admins can delete transactions" 
  on public.transactions for delete 
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Create notifications table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  message text not null,
  type text default 'info',
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  constraint valid_notification_type check (type in ('info', 'success', 'warning', 'transaction'))
);

-- Enable RLS on notifications
alter table public.notifications enable row level security;

-- Create RLS policies for notifications
-- Users can view their own notifications
create policy "Users can view own notifications" 
  on public.notifications for select 
  using (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
create policy "Users can update own notifications" 
  on public.notifications for update 
  using (auth.uid() = user_id);

-- Admins can view all notifications
create policy "Admins can view all notifications" 
  on public.notifications for select 
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Admins can send notifications to any user
create policy "Admins can create notifications" 
  on public.notifications for insert 
  with check (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Admins can update/delete notifications
create policy "Admins can update all notifications" 
  on public.notifications for update 
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can delete notifications" 
  on public.notifications for delete 
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar, balance, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 2)),
    0.00,
    'active'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create indexes for better performance
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_timestamp on public.transactions(timestamp desc);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_created_at on public.notifications(created_at desc);
create index idx_profiles_status on public.profiles(status);
create index idx_profiles_is_admin on public.profiles(is_admin);
