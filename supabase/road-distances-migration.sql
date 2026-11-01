-- Road distances from dispatch yards (Campbellfield / Laverton), cached for zone pricing.
begin;

create table if not exists public.suburb_road_distances (
  id text primary key,
  suburb text not null,
  postcode text not null check (postcode ~ '^\d{4}$'),
  road_km numeric not null check (road_km >= 0),
  campbellfield_km numeric check (campbellfield_km is null or campbellfield_km >= 0),
  laverton_km numeric check (laverton_km is null or laverton_km >= 0),
  provider text not null default 'openrouteservice',
  updated_at timestamptz not null default now()
);

create index if not exists suburb_road_distances_postcode_idx
  on public.suburb_road_distances (postcode);

alter table public.suburb_road_distances enable row level security;
revoke all on public.suburb_road_distances from anon, authenticated;
grant all on public.suburb_road_distances to service_role;

commit;
