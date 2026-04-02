insert into customer_cards (customer_name, region, market, notes) values
('WAAF', 'GCC', 'GCC', 'Seed customer card for GCC account'),
('Pidilite', 'India', 'India', 'Seed customer card for India account'),
('Innivate', 'SEA', 'SEA', 'Seed customer card for SEA account')
on conflict do nothing;

insert into products (sku, product_name, constraint_text, above_waterline_only) values
('WTZ-1700', 'WTZ-1700', 'Above-waterline only', true),
('WTZ-1800', 'WTZ-1800', 'Above-waterline only', true),
('WE-50', 'WE-50', null, false),
('WE-100', 'WE-100', null, false),
('Z-1680-90', 'Z-1680-90', null, false),
('INSUROPE-120', 'INSUROPE-120', null, false)
on conflict do nothing;
