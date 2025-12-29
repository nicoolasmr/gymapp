-- ============================================
-- FIX: SEED CORRECT COMMUNITIES
-- ============================================
-- Inserts communities matching the internal app modalities (gym_standard, crossfit_box, studio)

INSERT INTO communities (modality, description, banner_url) VALUES
('crossfit_box', 'Comunidade Global de CrossFit. WODs, PRs e superação.', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
('gym_standard', 'Musculação e Hipertrofia. Foco, técnica e disciplina.', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
('studio', 'Studios, Yoga e Pilates. Equilíbrio, flexibilidade e paz.', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')
ON CONFLICT (modality) DO UPDATE 
SET description = EXCLUDED.description, banner_url = EXCLUDED.banner_url;
