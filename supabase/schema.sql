-- ============================================================
-- Flood Intelligence & Reporting System — Kenya
-- Supabase Schema
-- Run this in Supabase SQL Editor (once)
-- ============================================================

-- 1. FLOOD REPORTS
CREATE TABLE IF NOT EXISTS flood_reports (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source               TEXT NOT NULL DEFAULT 'web',   -- 'telegram', 'web', 'admin'
    language             TEXT DEFAULT 'sw',              -- 'sw' or 'en'
    raw_message          TEXT,
    location             TEXT,
    county               TEXT,
    lat                  FLOAT,
    lng                  FLOAT,
    severity             INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
    water_level          TEXT,                           -- 'knee','waist','shoulder','head'
    needs_rescue         BOOLEAN DEFAULT false,
    infrastructure       TEXT[],                         -- ['road','bridge','house']
    reporter_contact     TEXT,                           -- phone or telegram username
    verified             BOOLEAN DEFAULT false,
    resolved             BOOLEAN DEFAULT false,
    image_url            TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SHELTERS
CREATE TABLE IF NOT EXISTS shelters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    name_sw     TEXT,
    type        TEXT DEFAULT 'shelter',  -- 'school','church','hospital','camp','shelter'
    county      TEXT,
    lat         FLOAT NOT NULL,
    lng         FLOAT NOT NULL,
    capacity    INTEGER,
    contact     TEXT,
    is_active   BOOLEAN DEFAULT true
);

-- 3. KENYA COUNTIES (reference + coordinates)
CREATE TABLE IF NOT EXISTS counties (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    name_sw     TEXT,
    lat         FLOAT,
    lng         FLOAT,
    population  INTEGER
);

-- 4. ALERTS LOG
CREATE TABLE IF NOT EXISTS alerts_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id   UUID REFERENCES flood_reports(id) ON DELETE SET NULL,
    channel     TEXT NOT NULL,   -- 'sms', 'email', 'telegram'
    recipient   TEXT,
    message     TEXT,
    sent_at     TIMESTAMPTZ DEFAULT NOW(),
    success     BOOLEAN DEFAULT false
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reports_county     ON flood_reports(county);
CREATE INDEX IF NOT EXISTS idx_reports_severity   ON flood_reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_created    ON flood_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_rescue     ON flood_reports(needs_rescue) WHERE needs_rescue = true;
CREATE INDEX IF NOT EXISTS idx_shelters_county    ON shelters(county);

-- ============================================================
-- ENABLE REAL-TIME (run after table creation)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE flood_reports;

-- ============================================================
-- SEED: KENYA COUNTIES (all 47)
-- ============================================================
INSERT INTO counties (name, name_sw, lat, lng, population) VALUES
('Nairobi',       'Nairobi',        -1.2921,  36.8219,  4397073),
('Mombasa',       'Mombasa',        -4.0435,  39.6682,  1208333),
('Kisumu',        'Kisumu',         -0.1022,  34.7617,   1155574),
('Nakuru',        'Nakuru',         -0.3031,  36.0800,  2162202),
('Eldoret',       'Eldoret',         0.5143,  35.2698,  1163186),
('Kisii',         'Kisii',          -0.6698,  34.7679,  1266860),
('Nyeri',         'Nyeri',          -0.4167,  36.9500,   759164),
('Meru',          'Meru',            0.0460,  37.6490,  1545714),
('Kakamega',      'Kakamega',        0.2827,  34.7519,  1867579),
('Machakos',      'Machakos',       -1.5177,  37.2634,  1421932),
('Kilifi',        'Kilifi',         -3.6305,  39.8499,  1453787),
('Kwale',         'Kwale',          -4.1730,  39.4506,   866820),
('Kitui',         'Kitui',          -1.3667,  37.9833,  1136187),
('Garissa',       'Garissa',        -0.4532,  42.0000,   841353),
('Turkana',       'Turkana',         3.1179,  35.5956,  1016174),
('Mandera',       'Mandera',         3.9373,  41.8569,   867457),
('Wajir',         'Wajir',           1.7471,  40.0573,   661941),
('Marsabit',      'Marsabit',        2.3284,  37.9899,   459785),
('Isiolo',        'Isiolo',          0.3541,  38.0006,   268002),
('Tana River',    'Tana River',     -1.5000,  40.1000,   315943),
('Lamu',          'Lamu',           -2.2694,  40.9022,   143920),
('Taita Taveta',  'Taita Taveta',   -3.3162,  38.4826,   340671),
('Kajiado',       'Kajiado',        -1.8516,  36.7820,  1117840),
('Makueni',       'Makueni',        -2.2585,  37.8942,   987653),
('Nyandarua',     'Nyandarua',      -0.1834,  36.5228,   638289),
('Laikipia',      'Laikipia',        0.3606,  36.7819,   518560),
('Samburu',       'Samburu',         1.2157,  36.9781,   310327),
('Trans Nzoia',   'Trans Nzoia',     1.0566,  34.9500,   990341),
('Uasin Gishu',   'Uasin Gishu',     0.5533,  35.2697,  1163186),
('Elgeyo Marakwet','Elgeyo Marakwet', 1.0500,  35.5000,  454480),
('Nandi',         'Nandi',           0.1833,  35.1167,   885711),
('Baringo',       'Baringo',         0.4667,  35.9667,   666763),
('Bomet',         'Bomet',          -0.7833,  35.3333,   857842),
('Kericho',       'Kericho',        -0.3667,  35.2833,   901777),
('Narok',         'Narok',          -1.0833,  36.0833,  1157873),
('Migori',        'Migori',         -1.0634,  34.4731,  1116436),
('Homa Bay',      'Homa Bay',       -0.5273,  34.4571,  1131950),
('Siaya',         'Siaya',           0.0611,  34.2881,   993183),
('Vihiga',        'Vihiga',          0.0833,  34.7167,   590013),
('Bungoma',       'Bungoma',         0.5635,  34.5606,  1670570),
('Busia',         'Busia',           0.4608,  34.1117,   893681),
('West Pokot',    'West Pokot',      1.7500,  35.1167,   621241),
('Embu',          'Embu',           -0.5333,  37.4500,   608599),
('Tharaka Nithi', 'Tharaka Nithi',  -0.3000,  37.9167,   393177),
('Kirinyaga',     'Kirinyaga',      -0.6594,  37.3822,   610411),
('Murang''a',     'Murang''a',      -0.7167,  37.1500,  1056640),
('Kiambu',        'Kiambu',         -1.0311,  36.8309,  2417735)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: KEY SHELTERS (major towns — expand as needed)
-- ============================================================
INSERT INTO shelters (name, name_sw, type, county, lat, lng, capacity, contact) VALUES
('Nairobi Red Cross Centre',   'Kituo cha Red Cross Nairobi', 'camp',     'Nairobi',  -1.2833, 36.8167, 500,  '0800 723 000'),
('Kenyatta National Hospital', 'KNH',                          'hospital', 'Nairobi',  -1.3017, 36.8073, 200,  '+254 20 2726300'),
('Kisumu County Stadium',      'Uwanja wa Kisumu',             'camp',     'Kisumu',   -0.0917, 34.7678, 800,  '+254 57 2023539'),
('Mombasa Red Cross',          'Red Cross Mombasa',            'camp',     'Mombasa',  -4.0500, 39.6667, 400,  '0800 723 000'),
('Nakuru War Memorial Hospital','Hospitali Nakuru',            'hospital', 'Nakuru',   -0.2800, 36.0700, 150,  '+254 51 2212422'),
('Garissa County Referral',    'Hospitali Garissa',            'hospital', 'Garissa',  -0.4500, 42.0167, 100,  '+254 46 2062000'),
('Kakamega General Hospital',  'Hospitali Kakamega',           'hospital', 'Kakamega',  0.2833, 34.7500, 150,  '+254 56 2030711'),
('Kisii Teaching Hospital',    'Hospitali Kisii',              'hospital', 'Kisii',    -0.6771, 34.7800, 120,  '+254 58 2031300'),
('Meru Level 5 Hospital',      'Hospitali Meru',               'hospital', 'Meru',      0.0500, 37.6500, 130,  '+254 64 2030000'),
('Eldoret MTRH',               'MTRH Eldoret',                 'hospital', 'Eldoret',   0.5200, 35.2700, 180,  '+254 53 2033471')
ON CONFLICT DO NOTHING;
