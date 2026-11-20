-- Rosa Beauty: initial salon data (settings, categories, services, masters, schedules).
-- Idempotent: safe to run more than once, existing rows are left unchanged.

BEGIN;

-- Salon settings ------------------------------------------------------------
INSERT INTO settings (
  id, name, address_ru, address_en, phone, instagram, hours_ru, hours_en,
  latitude, longitude, timezone, currency, slot_step_min, min_lead_time_min,
  cancel_deadline_hours, booking_horizon_days, reminders_enabled, reviews_enabled
) VALUES (
  1, 'Rosa Beauty',
  'Москва, ул. Пятницкая, 37, 2 этаж',
  '37 Pyatnitskaya St, 2nd floor, Moscow',
  '+7 495 128-47-63',
  'https://instagram.com/rosabeauty.studio',
  'Ежедневно с 10:00 до 21:00',
  'Daily 10:00–21:00',
  55.739810, 37.627390,
  'Europe/Moscow', 'USD', 15, 60, 3, 14, true, true
) ON CONFLICT (id) DO NOTHING;

-- Categories ----------------------------------------------------------------
INSERT INTO categories (id, name_ru, name_en, sort, is_active) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'Стрижки и укладки', 'Haircuts & Styling', 1, true),
  ('c1000000-0000-4000-8000-000000000002', 'Окрашивание',       'Hair Coloring',      2, true),
  ('c1000000-0000-4000-8000-000000000003', 'Маникюр и педикюр', 'Manicure & Pedicure', 3, true),
  ('c1000000-0000-4000-8000-000000000004', 'Брови и ресницы',   'Brows & Lashes',     4, true),
  ('c1000000-0000-4000-8000-000000000005', 'Макияж',            'Makeup',             5, true),
  ('c1000000-0000-4000-8000-000000000006', 'Уход за лицом',     'Facial Care',        6, true)
ON CONFLICT (id) DO NOTHING;

-- Services ------------------------------------------------------------------
INSERT INTO services (id, category_id, name_ru, name_en, description_ru, description_en, duration_min, price, sort, is_active) VALUES
  -- Haircuts & Styling
  ('5e000000-0000-4000-8000-000000000101', 'c1000000-0000-4000-8000-000000000001',
   'Женская стрижка', 'Women''s haircut',
   'Консультация, мытьё головы, стрижка и лёгкая укладка.',
   'Consultation, hair wash, cut and a light blow-dry.', 60, 45.00, 1, true),
  ('5e000000-0000-4000-8000-000000000102', 'c1000000-0000-4000-8000-000000000001',
   'Мужская стрижка', 'Men''s haircut',
   'Стрижка машинкой и ножницами, мытьё и укладка.',
   'Clipper and scissor cut, wash and styling.', 45, 30.00, 2, true),
  ('5e000000-0000-4000-8000-000000000103', 'c1000000-0000-4000-8000-000000000001',
   'Укладка', 'Blow-dry & styling',
   'Мытьё головы и укладка феном, утюжком или на локоны.',
   'Hair wash and styling with a dryer, straightener or curls.', 45, 35.00, 3, true),
  ('5e000000-0000-4000-8000-000000000104', 'c1000000-0000-4000-8000-000000000001',
   'Вечерняя причёска', 'Evening updo',
   'Собранная или полусобранная причёска для праздника.',
   'An updo or half-up style for a special occasion.', 90, 70.00, 4, true),

  -- Hair Coloring
  ('5e000000-0000-4000-8000-000000000201', 'c1000000-0000-4000-8000-000000000002',
   'Окрашивание в один тон', 'Single-tone coloring',
   'Окрашивание корней и длины в один цвет, уход после окрашивания.',
   'Roots and lengths in one shade, plus aftercare treatment.', 120, 90.00, 1, true),
  ('5e000000-0000-4000-8000-000000000202', 'c1000000-0000-4000-8000-000000000002',
   'Тонирование', 'Toning',
   'Обновление оттенка и блеска волос.',
   'Refreshes the shade and adds shine.', 90, 65.00, 2, true),
  ('5e000000-0000-4000-8000-000000000203', 'c1000000-0000-4000-8000-000000000002',
   'Мелирование', 'Highlights',
   'Классическое мелирование с тонированием.',
   'Classic highlights with toning.', 180, 140.00, 3, true),
  ('5e000000-0000-4000-8000-000000000204', 'c1000000-0000-4000-8000-000000000002',
   'Сложное окрашивание (AirTouch, балаяж)', 'Advanced coloring (AirTouch, balayage)',
   'Мягкие переходы цвета, тонирование и уход. Время зависит от длины волос.',
   'Soft color blending, toning and care. Timing depends on hair length.', 240, 180.00, 4, true),

  -- Manicure & Pedicure
  ('5e000000-0000-4000-8000-000000000301', 'c1000000-0000-4000-8000-000000000003',
   'Классический маникюр', 'Classic manicure',
   'Обработка кутикулы и придание формы, без покрытия.',
   'Cuticle care and shaping, no polish.', 45, 25.00, 1, true),
  ('5e000000-0000-4000-8000-000000000302', 'c1000000-0000-4000-8000-000000000003',
   'Маникюр с покрытием гель-лак', 'Manicure with gel polish',
   'Аппаратный или комбинированный маникюр и однотонное покрытие.',
   'Hardware or combined manicure with a solid gel color.', 90, 40.00, 2, true),
  ('5e000000-0000-4000-8000-000000000303', 'c1000000-0000-4000-8000-000000000003',
   'Педикюр с покрытием гель-лак', 'Pedicure with gel polish',
   'Обработка стоп и пальцев, покрытие гель-лаком.',
   'Foot and toe care finished with gel polish.', 90, 50.00, 3, true),
  ('5e000000-0000-4000-8000-000000000304', 'c1000000-0000-4000-8000-000000000003',
   'Наращивание ногтей', 'Nail extensions',
   'Наращивание гелем на формы, моделирование и покрытие.',
   'Gel extensions on forms, shaping and polish.', 150, 70.00, 4, true),
  ('5e000000-0000-4000-8000-000000000305', 'c1000000-0000-4000-8000-000000000003',
   'Снятие покрытия', 'Polish removal',
   'Аккуратное снятие гель-лака и придание формы.',
   'Gentle gel polish removal and shaping.', 30, 15.00, 5, true),

  -- Brows & Lashes
  ('5e000000-0000-4000-8000-000000000401', 'c1000000-0000-4000-8000-000000000004',
   'Коррекция и окрашивание бровей', 'Brow shaping & tint',
   'Подбор формы, коррекция воском или пинцетом, окрашивание краской или хной.',
   'Shape mapping, wax or tweezer shaping, dye or henna tint.', 45, 25.00, 1, true),
  ('5e000000-0000-4000-8000-000000000402', 'c1000000-0000-4000-8000-000000000004',
   'Ламинирование бровей', 'Brow lamination',
   'Долговременная укладка бровей, коррекция и окрашивание.',
   'Long-lasting brow styling with shaping and tint.', 60, 40.00, 2, true),
  ('5e000000-0000-4000-8000-000000000403', 'c1000000-0000-4000-8000-000000000004',
   'Ламинирование ресниц', 'Lash lift',
   'Изгиб и питание натуральных ресниц, окрашивание.',
   'Curl and nourish natural lashes, with tint.', 60, 45.00, 3, true),
  ('5e000000-0000-4000-8000-000000000404', 'c1000000-0000-4000-8000-000000000004',
   'Наращивание ресниц (классика)', 'Classic lash extensions',
   'Поресничное наращивание с естественным эффектом.',
   'One-to-one extensions for a natural look.', 120, 60.00, 4, true),

  -- Makeup
  ('5e000000-0000-4000-8000-000000000501', 'c1000000-0000-4000-8000-000000000005',
   'Дневной макияж', 'Day makeup',
   'Лёгкий естественный макияж.',
   'Light, natural everyday makeup.', 60, 50.00, 1, true),
  ('5e000000-0000-4000-8000-000000000502', 'c1000000-0000-4000-8000-000000000005',
   'Вечерний макияж', 'Evening makeup',
   'Выразительный макияж для мероприятия.',
   'A bold look for an event.', 90, 75.00, 2, true),
  ('5e000000-0000-4000-8000-000000000503', 'c1000000-0000-4000-8000-000000000005',
   'Свадебный макияж', 'Bridal makeup',
   'Стойкий макияж для свадебного дня.',
   'Long-wear makeup for your wedding day.', 120, 110.00, 3, true),

  -- Facial Care
  ('5e000000-0000-4000-8000-000000000601', 'c1000000-0000-4000-8000-000000000006',
   'Чистка лица', 'Facial cleansing',
   'Комбинированная чистка, маска и уход по типу кожи.',
   'Combined cleansing, mask and care for your skin type.', 90, 70.00, 1, true),
  ('5e000000-0000-4000-8000-000000000602', 'c1000000-0000-4000-8000-000000000006',
   'Уходовая процедура', 'Hydrating facial',
   'Увлажнение и питание кожи, массаж лица.',
   'Hydration and nourishment with a facial massage.', 60, 55.00, 2, true),
  ('5e000000-0000-4000-8000-000000000603', 'c1000000-0000-4000-8000-000000000006',
   'Пилинг', 'Chemical peel',
   'Мягкий кислотный пилинг для ровного тона кожи.',
   'A gentle acid peel for an even skin tone.', 45, 50.00, 3, true)
ON CONFLICT (id) DO NOTHING;

-- Masters -------------------------------------------------------------------
INSERT INTO masters (id, name_ru, name_en, specialty_ru, specialty_en, experience_years, photo_url, sort, is_active) VALUES
  ('3a000000-0000-4000-8000-000000000001', 'Мария Соколова', 'Maria Sokolova',
   'Стилист-колорист', 'Hair stylist & colorist', 9, NULL, 1, true),
  ('3a000000-0000-4000-8000-000000000002', 'Анна Ковалёва', 'Anna Kovaleva',
   'Парикмахер-стилист', 'Hair stylist', 5, NULL, 2, true),
  ('3a000000-0000-4000-8000-000000000003', 'Екатерина Белова', 'Ekaterina Belova',
   'Мастер ногтевого сервиса', 'Nail artist', 6, NULL, 3, true),
  ('3a000000-0000-4000-8000-000000000004', 'Ольга Морозова', 'Olga Morozova',
   'Бровист и лашмейкер', 'Brow & lash artist', 4, NULL, 4, true),
  ('3a000000-0000-4000-8000-000000000005', 'Дарья Лебедева', 'Daria Lebedeva',
   'Визажист-косметолог', 'Makeup artist & facialist', 7, NULL, 5, true)
ON CONFLICT (id) DO NOTHING;

-- Services each master performs ----------------------------------------------
-- Maria: all haircuts, styling and coloring
INSERT INTO master_services (master_id, service_id)
SELECT '3a000000-0000-4000-8000-000000000001', id FROM services
WHERE category_id IN ('c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002')
ON CONFLICT DO NOTHING;

-- Anna: haircuts, styling and coloring except advanced techniques
INSERT INTO master_services (master_id, service_id)
SELECT '3a000000-0000-4000-8000-000000000002', id FROM services
WHERE category_id IN ('c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002')
  AND id <> '5e000000-0000-4000-8000-000000000204'
ON CONFLICT DO NOTHING;

-- Ekaterina: manicure and pedicure
INSERT INTO master_services (master_id, service_id)
SELECT '3a000000-0000-4000-8000-000000000003', id FROM services
WHERE category_id = 'c1000000-0000-4000-8000-000000000003'
ON CONFLICT DO NOTHING;

-- Olga: brows and lashes
INSERT INTO master_services (master_id, service_id)
SELECT '3a000000-0000-4000-8000-000000000004', id FROM services
WHERE category_id = 'c1000000-0000-4000-8000-000000000004'
ON CONFLICT DO NOTHING;

-- Daria: makeup and facial care
INSERT INTO master_services (master_id, service_id)
SELECT '3a000000-0000-4000-8000-000000000005', id FROM services
WHERE category_id IN ('c1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000006')
ON CONFLICT DO NOTHING;

-- Working hours (weekday: 1 = Monday ... 7 = Sunday) --------------------------
INSERT INTO working_hours (master_id, weekday, start_time, end_time, break_start, break_end) VALUES
  -- Maria: Wednesday–Sunday, days off Monday and Tuesday
  ('3a000000-0000-4000-8000-000000000001', 3, '10:00', '20:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000001', 4, '10:00', '20:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000001', 5, '10:00', '20:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000001', 6, '10:00', '20:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000001', 7, '10:00', '20:00', NULL, NULL),
  -- Anna: Monday–Friday with a lunch break
  ('3a000000-0000-4000-8000-000000000002', 1, '10:00', '19:00', '14:00', '15:00'),
  ('3a000000-0000-4000-8000-000000000002', 2, '10:00', '19:00', '14:00', '15:00'),
  ('3a000000-0000-4000-8000-000000000002', 3, '10:00', '19:00', '14:00', '15:00'),
  ('3a000000-0000-4000-8000-000000000002', 4, '10:00', '19:00', '14:00', '15:00'),
  ('3a000000-0000-4000-8000-000000000002', 5, '10:00', '19:00', '14:00', '15:00'),
  -- Ekaterina: Monday–Saturday
  ('3a000000-0000-4000-8000-000000000003', 1, '10:00', '21:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000003', 2, '10:00', '21:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000003', 3, '10:00', '21:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000003', 4, '10:00', '21:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000003', 5, '10:00', '21:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000003', 6, '10:00', '21:00', NULL, NULL),
  -- Olga: Tuesday–Saturday
  ('3a000000-0000-4000-8000-000000000004', 2, '11:00', '20:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000004', 3, '11:00', '20:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000004', 4, '11:00', '20:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000004', 5, '11:00', '20:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000004', 6, '11:00', '20:00', NULL, NULL),
  -- Daria: weekends only
  ('3a000000-0000-4000-8000-000000000005', 6, '10:00', '19:00', NULL, NULL),
  ('3a000000-0000-4000-8000-000000000005', 7, '10:00', '19:00', NULL, NULL)
ON CONFLICT (master_id, weekday) DO NOTHING;

COMMIT;
