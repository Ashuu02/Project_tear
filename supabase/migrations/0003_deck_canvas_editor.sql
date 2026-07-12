-- Phase 2 deck editor: adds a column for the editable CanvasSlide[] representation,
-- kept separate from `deck_data` (the flat DeckSlide[] the admin dashboard already
-- reads for its "N slides generated" summary) so that display path is untouched.
ALTER TABLE admin_teardowns ADD COLUMN IF NOT EXISTS canvas_data JSONB;
