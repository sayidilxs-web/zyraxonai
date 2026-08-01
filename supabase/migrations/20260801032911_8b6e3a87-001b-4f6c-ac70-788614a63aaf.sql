REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_comments_count() FROM PUBLIC, anon, authenticated;