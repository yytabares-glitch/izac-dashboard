-- ============ TABLES CONSOMMABLES IZAC ============
create table if not exists conso_magasins (
  code text primary key, nom text not null, fastmag text not null,
  type text not null check (type in ('R','O','A'))
);
create table if not exists conso_articles (
  id bigint generated always as identity primary key,
  ordre int, categorie text not null, libelle text not null,
  gencod text default '', statut text default 'check', profils text not null
);
create table if not exists conso_login_attempts (
  id int primary key default 1, fails int not null default 0,
  locked_until timestamptz, updated_at timestamptz default now()
);
insert into conso_login_attempts (id) values (1) on conflict (id) do nothing;

alter table conso_magasins enable row level security;
alter table conso_articles enable row level security;
alter table conso_login_attempts enable row level security;
create policy "read mag" on conso_magasins for select using (true);
create policy "read art" on conso_articles for select using (true);
create policy "ins art" on conso_articles for insert with check (true);
create policy "upd art" on conso_articles for update using (true);
create policy "del art" on conso_articles for delete using (true);

create or replace function conso_login(p_hash text)
returns json language plpgsql security definer as $$
declare rec conso_login_attempts%rowtype;
  good constant text := '86853ece4e2ce6de7f3516048b854f9c3779cbaf5bf17a99a2f2a825b53b4d62';
  maxf constant int := 5; lock_min constant int := 15;
begin
  select * into rec from conso_login_attempts where id=1 for update;
  if rec.locked_until is not null and rec.locked_until > now() then
    return json_build_object('ok',false,'locked',true,'wait',ceil(extract(epoch from (rec.locked_until-now()))/60)); end if;
  if p_hash = good then
    update conso_login_attempts set fails=0,locked_until=null,updated_at=now() where id=1;
    return json_build_object('ok',true); end if;
  rec.fails := rec.fails+1;
  if rec.fails >= maxf then
    update conso_login_attempts set fails=0,locked_until=now()+(lock_min||' minutes')::interval,updated_at=now() where id=1;
    return json_build_object('ok',false,'locked',true,'wait',lock_min);
  else
    update conso_login_attempts set fails=rec.fails,updated_at=now() where id=1;
    return json_build_object('ok',false,'left',maxf-rec.fails); end if;
end; $$;
grant execute on function conso_login(text) to anon;
