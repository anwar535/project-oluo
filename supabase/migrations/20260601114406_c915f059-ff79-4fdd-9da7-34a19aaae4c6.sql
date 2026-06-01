
-- Update sheet_tab to match actual Google Sheets tab names (Arabic, some with leading spaces)
UPDATE public.projects SET sheet_tab = 'مشروع علو 16' WHERE id = '16';
UPDATE public.projects SET sheet_tab = ' مشروع علو 17' WHERE id = '17';
UPDATE public.projects SET sheet_tab = 'مشروع علو 18' WHERE id = '18';
UPDATE public.projects SET sheet_tab = 'مشروع علو 19' WHERE id = '19';
UPDATE public.projects SET sheet_tab = 'مشروع علو 20' WHERE id = '20';
UPDATE public.projects SET sheet_tab = 'مشروع علو 22' WHERE id = '22';
UPDATE public.projects SET sheet_tab = ' مشروع علو 23' WHERE id = '23';
UPDATE public.projects SET sheet_tab = 'مشروع علو 24' WHERE id = '24';
UPDATE public.projects SET sheet_tab = ' مشروع علو 25' WHERE id = '25';
UPDATE public.projects SET sheet_tab = ' مشروع علو 27' WHERE id = '27';
UPDATE public.projects SET sheet_tab = ' مشروع علو 28' WHERE id = '28';

-- Insert missing projects 21 and 26
INSERT INTO public.projects (id, slug, name, category, status, sheet_tab, sort_order)
VALUES
  ('21', 'oluo-21', 'مشروع علو 21', 'Apartments', 'قريباً', ' مشروع علو 21', 21),
  ('26', 'oluo-26', 'مشروع علو 26', 'Apartments', 'قريباً', 'مشروع علو 26', 26)
ON CONFLICT (id) DO UPDATE SET sheet_tab = EXCLUDED.sheet_tab;
