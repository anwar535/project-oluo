
-- Enums + roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "anyone authenticated can read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Auto-grant admin to allowed emails on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email in ('khalid@ioluo.com','anwar@ioluo.com') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- Projects
create table public.projects (
  id text primary key,                 -- e.g. "16"
  slug text not null unique,
  name text not null,
  category text not null default 'Apartments',
  type text,
  tagline text,
  district text,
  status text not null default 'قريباً',
  cover_image text,
  sheet_tab text,                       -- name of the Google Sheet tab
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();
alter table public.projects enable row level security;
create policy "public read projects" on public.projects for select using (true);
create policy "admins write projects" on public.projects for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Units
create table public.units (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  unit_number text not null,
  area_m2 text,
  dimensions text,
  built_area_m2 text,
  price text,
  features text,
  status text not null default 'متاح',
  plan_image text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, unit_number)
);
create trigger units_updated before update on public.units for each row execute function public.set_updated_at();
create index units_project_idx on public.units(project_id);
alter table public.units enable row level security;
create policy "public read units" on public.units for select using (true);
create policy "admins write units" on public.units for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Storage bucket for plan images
insert into storage.buckets (id, name, public) values ('plans','plans', true)
on conflict (id) do nothing;

create policy "public read plans" on storage.objects for select using (bucket_id = 'plans');
create policy "admins upload plans" on storage.objects for insert to authenticated
  with check (bucket_id = 'plans' and public.has_role(auth.uid(),'admin'));
create policy "admins update plans" on storage.objects for update to authenticated
  using (bucket_id = 'plans' and public.has_role(auth.uid(),'admin'));
create policy "admins delete plans" on storage.objects for delete to authenticated
  using (bucket_id = 'plans' and public.has_role(auth.uid(),'admin'));

-- Sync metadata table
create table public.sync_log (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  status text not null,
  message text,
  inserted_rows int default 0,
  updated_rows int default 0
);
alter table public.sync_log enable row level security;
create policy "admins read sync_log" on public.sync_log for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- Seed projects (matches Google Sheet tabs named "16".."28")
insert into public.projects (id, slug, name, category, type, tagline, district, status, cover_image, sheet_tab, sort_order) values
('16','oluo-16','مشروع علو 16','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','قريباً','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-%D9%A1%D9%A6%D9%A4-scaled.jpeg','16',16),
('17','oluo-17','مشروع علو 17','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','قريباً','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B4%D9%A1%D9%A7.jpg','17',17),
('18','oluo-18','مشروع علو 18','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','مُباع بالكامل','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D9%A2.jpg','18',18),
('19','oluo-19','مشروع علو 19','Villas','فلل سكنية فاخرة','فلل سكنية فاخرة بتصاميم عصرية','حي النرجس','مُباع بالكامل','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-19-copy-2-e1776593918813.jpg','19',19),
('20','oluo-20','مشروع علو 20','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','قريباً','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/b1-e1776594534348.jpg','20',20),
('22','oluo-22','مشروع علو 22','Apartments','شقق سكنية فاخرة','مجمع شقق سكنية فاخرة','الرياض','متاح للبيع','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-%D9%A2%D9%A2%D9%A5.jpg','22',22),
('23','oluo-23','مشروع علو 23','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','مُباع بالكامل','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/02/JPG-4-e1776593998863.jpg','23',23),
('24','oluo-24','مشروع علو 24','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','مُباع بالكامل','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/0_55-Photo.jpg','24',24),
('25','oluo-25','مشروع علو 25','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','مُباع بالكامل','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/1_1-Photo-e1776598058388.jpg','25',25),
('27','oluo-27','مشروع علو 27','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','مُباع بالكامل','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/0_59-Photo.jpg','27',27),
('28','oluo-28','مشروع علو 28','Apartments','شقق سكنية فاخرة','شقق سكنية فاخرة','حي العقيق - الرياض','متاح للبيع','https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/02/%D9%86%D8%B3%D8%AE%D8%A9-%D9%85%D9%86-q5-1.jpg','28',28);
