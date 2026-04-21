insert into public.jurisdiction (slug, name, timezone, official_url) values
  ('cedar-park', 'Cedar Park', 'America/Chicago', 'https://www.cedarparktexas.gov'),
  ('leander', 'Leander', 'America/Chicago', 'https://www.leandertx.gov'),
  ('austin', 'Austin', 'America/Chicago', 'https://www.austintexas.gov')
on conflict (slug) do nothing;

insert into public.waste_stream (code, label, sort_order) values
  ('curbside_recycling', 'Curbside recycling', 10),
  ('curbside_trash', 'Curbside trash', 20),
  ('compost', 'Compost / organics', 30),
  ('dropoff_center', 'Drop-off center', 40),
  ('hhw', 'Household hazardous waste', 50),
  ('bulk', 'Bulk pickup', 60),
  ('not_accepted', 'Not accepted', 100)
on conflict (code) do nothing;
