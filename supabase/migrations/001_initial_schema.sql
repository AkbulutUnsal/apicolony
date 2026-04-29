-- ApiColony Veritabanı Şeması
-- supabase.com > SQL Editor'a yapıştır ve çalıştır

-- Profiller (auth.users ile bağlantılı)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null default 'arici', -- 'arici' | 'yardimci' | 'admin'
  avatar_color text default '#f5c518',
  created_at timestamptz default now()
);

-- Apiari / Apiyer (arılık lokasyonu)
create table if not exists apiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  location text,
  latitude double precision,
  longitude double precision,
  notes text,
  created_at timestamptz default now()
);

-- Kovanlar
create table if not exists hives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  apiary_id uuid references apiaries(id) on delete set null,
  hive_no text not null,           -- A-1, B-5 gibi
  barcode text,                     -- TR-34-1001
  hive_type text default 'Langstroth', -- Langstroth, Dadant, Nijemce
  source text default 'Kendi Arım',    -- Kendi Arım, Satın Alınan, Oğul
  frame_count integer default 10,
  honey_stock_kg numeric(5,2) default 0,
  brood_status text default 'İyi',     -- İyi, Orta, Zayıf, Yok
  aggressiveness text,                  -- Sakin, Normal, Hırçın
  has_ventilated_bottom boolean default false,
  has_pollen_trap boolean default false,
  status text default 'aktif',          -- aktif, arsiv, satildi
  color_status text default 'normal',   -- normal, warning, danger (panel rengi için)
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ana Arı
create table if not exists queens (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid references hives(id) on delete cascade not null,
  birth_date date,
  breed text default 'Anadolu',  -- Anadolu, Kafkas, Karniyol, İtalyan
  insemination_type text default 'Doğal', -- Doğal, Suni Tohumlama
  color_mark text,
  performance text,
  replacement_date date,
  is_current boolean default true,
  created_at timestamptz default now()
);

-- Ballıklar
create table if not exists supers (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid references hives(id) on delete cascade not null,
  super_type text default 'Standart', -- Standart, Karakovan
  frame_count integer default 8,
  added_date date default current_date,
  removed_date date,
  honey_harvested_kg numeric(5,2),
  notes text,
  created_at timestamptz default now()
);

-- Hastalık Kayıtları
create table if not exists disease_records (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid references hives(id) on delete cascade not null,
  recorded_by uuid references profiles(id),
  disease_name text not null,       -- Varroa, Nosema, Amerikan Yavru Çürüklüğü...
  severity text,                    -- Hafif, Orta, Ağır
  treatment text,
  treatment_date date,
  end_date date,
  notes text,
  created_at timestamptz default now()
);

-- Bakım Kayıtları
create table if not exists maintenance_records (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid references hives(id) on delete cascade not null,
  recorded_by uuid references profiles(id),
  season text not null,             -- İlkbahar, Yaz, Sonbahar, Kışlatma
  inspection_date date default current_date,
  -- Genel durum
  colony_strength text,             -- Güçlü, Orta, Zayıf
  honey_frames integer,
  brood_frames integer,
  empty_frames integer,
  -- Kontroller
  queen_seen boolean default false,
  eggs_seen boolean default false,
  swarm_cells boolean default false,
  disease_signs boolean default false,
  -- Yapılanlar
  feed_given boolean default false,
  feed_type text,                   -- Şeker şurubu, Kandı, Polen
  feed_amount_kg numeric(5,2),
  treatment_applied boolean default false,
  treatment_name text,
  frames_added integer default 0,
  frames_removed integer default 0,
  notes text,
  created_at timestamptz default now()
);

-- Bal Hasat Kayıtları
create table if not exists honey_harvests (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid references hives(id) on delete cascade,
  apiary_id uuid references apiaries(id) on delete set null,
  user_id uuid references profiles(id) not null,
  harvest_date date default current_date,
  amount_kg numeric(8,2) not null,
  honey_type text,                  -- Çiçek, Orman, Kestane, Kekik...
  brix_value numeric(4,1),          -- Nem oranı (refraktometre)
  notes text,
  created_at timestamptz default now()
);

-- ======= ROW LEVEL SECURITY =======
alter table profiles enable row level security;
alter table apiaries enable row level security;
alter table hives enable row level security;
alter table queens enable row level security;
alter table supers enable row level security;
alter table disease_records enable row level security;
alter table maintenance_records enable row level security;
alter table honey_harvests enable row level security;

-- Kullanıcı kendi verisini görür
create policy "profiles_own" on profiles for all using (auth.uid() = id);
create policy "apiaries_own" on apiaries for all using (auth.uid() = user_id);
create policy "hives_own" on hives for all using (auth.uid() = user_id);
create policy "queens_own" on queens for all using (
  hive_id in (select id from hives where user_id = auth.uid())
);
create policy "supers_own" on supers for all using (
  hive_id in (select id from hives where user_id = auth.uid())
);
create policy "disease_own" on disease_records for all using (
  hive_id in (select id from hives where user_id = auth.uid())
);
create policy "maintenance_own" on maintenance_records for all using (
  hive_id in (select id from hives where user_id = auth.uid())
);
create policy "harvest_own" on honey_harvests for all using (auth.uid() = user_id);

-- Yeni kullanıcı kaydında otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at otomatik güncelle
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger hives_updated_at before update on hives
  for each row execute procedure update_updated_at();
