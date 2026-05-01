-- Run this SQL in Supabase SQL Editor

-- USERS TABLE
create table users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text unique not null,
  password text not null,
  role text default 'student',
  avatar text default '',
  course text default '',
  year text default '',
  subjects text[] default '{}',
  study_style text default 'flexible',
  bio text default '',
  phone text default '',
  match_vector float[] default '{}',
  created_at timestamp default now()
);

-- BOOKS TABLE
create table books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text default '',
  price numeric not null,
  original_price numeric default 0,
  image text default '',
  condition text not null,
  subject text default '',
  course text default '',
  year text default '',
  description text default '',
  seller text default '',
  seller_id uuid references users(id),
  seller_phone text default '',
  sold boolean default false,
  created_at timestamp default now()
);

-- MENTORS TABLE
create table mentors (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  name text not null,
  avatar text default '',
  subjects text[] default '{}',
  bio text default '',
  experience text default '',
  rating numeric default 0,
  total_ratings integer default 0,
  price numeric default 0,
  created_at timestamp default now()
);

-- MENTOR STUDENTS (connections)
create table mentor_students (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references mentors(id),
  student_id uuid references users(id),
  created_at timestamp default now()
);

-- QUIZZES TABLE
create table quizzes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  course text default '',
  mentor_id uuid references users(id),
  mentor_name text default '',
  is_premium boolean default false,
  questions jsonb default '[]',
  duration integer default 15,
  total_marks integer default 10,
  created_at timestamp default now()
);

-- Disable RLS for development (enable later in production)
alter table users disable row level security;
alter table books disable row level security;
alter table mentors disable row level security;
alter table mentor_students disable row level security;
alter table quizzes disable row level security;