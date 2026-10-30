-- Rodar UMA vez no SQL Editor do Supabase se o banco já tem a tabela books antiga.
-- (Para um banco novo, basta rodar schema.sql.)

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null check (password_hash like 'scrypt$%'),
  created_at timestamptz not null default now()
);

alter table public.books
  add column if not exists user_id uuid references public.users(id) on delete cascade;

create index if not exists books_user_id_idx on public.books(user_id);

-- Livros antigos ficam sem dono e não aparecem para ninguém. Para apagá-los e
-- exigir dono em todos os livros, descomente as duas linhas abaixo:
-- delete from public.books where user_id is null;
-- alter table public.books alter column user_id set not null;

alter table public.users enable row level security;
alter table public.books enable row level security;
