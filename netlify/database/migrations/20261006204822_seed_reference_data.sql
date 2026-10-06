INSERT INTO states(code,name) VALUES
('AC','Acre'),('AL','Alagoas'),('AP','Amapá'),('AM','Amazonas'),('BA','Bahia'),
('CE','Ceará'),('DF','Distrito Federal'),('ES','Espírito Santo'),('GO','Goiás'),
('MA','Maranhão'),('MT','Mato Grosso'),('MS','Mato Grosso do Sul'),('MG','Minas Gerais'),
('PA','Pará'),('PB','Paraíba'),('PR','Paraná'),('PE','Pernambuco'),('PI','Piauí'),
('RJ','Rio de Janeiro'),('RN','Rio Grande do Norte'),('RS','Rio Grande do Sul'),
('RO','Rondônia'),('RR','Roraima'),('SC','Santa Catarina'),('SP','São Paulo'),
('SE','Sergipe'),('TO','Tocantins')
ON CONFLICT (code) DO NOTHING;

INSERT INTO cargo_types(code,name,unit,has_animals,sort) VALUES
('bovinos','Bovinos','cabeças',true,1),('graos','Grãos','toneladas',false,2),
('madeira','Madeira','m³',false,3),('maquinas','Máquinas agrícolas','unidades',false,4),
('insumos','Insumos','toneladas',false,5),('fertilizantes','Fertilizantes','toneladas',false,6),
('racao','Ração','toneladas',false,7),('outras','Outras cargas','unidades',false,8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO system_settings(key,value) VALUES
('trial_days','30'::jsonb),('tracking_interval_seconds','60'::jsonb),
('report_validate_threshold','2'::jsonb),('tracking_retention_days','90'::jsonb),
('enforce_paywall','false'::jsonb),('pix_key','""'::jsonb),
('pix_name','""'::jsonb),('admin_whatsapp','""'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS requests_origin_gist_idx ON transport_requests USING gist(origin);
