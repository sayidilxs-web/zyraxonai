-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.item_category AS ENUM ('website','sdk','pdf','ai_bot','plugin','template','mobile_app','api');
CREATE TYPE public.item_status AS ENUM ('draft','published','archived','pending','rejected');
CREATE TYPE public.ai_session_status AS ENUM ('active','inactive','ended');

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  blog TEXT,
  location TEXT,
  email TEXT,
  github_id BIGINT UNIQUE,
  github_login TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; candidate TEXT; n INT := 0;
BEGIN
  base := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'login',
             split_part(COALESCE(NEW.email,'user'), '@', 1)), '[^a-z0-9_-]', '', 'g'));
  IF base = '' OR base IS NULL THEN base := 'user'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE login = candidate) LOOP
    n := n + 1; candidate := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, login, name, avatar_url, email)
  VALUES (NEW.id, candidate,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
          NEW.raw_user_meta_data->>'avatar_url', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ECOSYSTEM ITEMS ============
CREATE TABLE public.ecosystem_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category public.item_category NOT NULL,
  content JSONB,
  tags TEXT[] NOT NULL DEFAULT '{}',
  github_url TEXT,
  demo_url TEXT,
  thumbnail_url TEXT,
  status public.item_status NOT NULL DEFAULT 'draft',
  marketplace_published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (author_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecosystem_items TO authenticated;
GRANT SELECT ON public.ecosystem_items TO anon;
GRANT ALL ON public.ecosystem_items TO service_role;
ALTER TABLE public.ecosystem_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_public_read" ON public.ecosystem_items FOR SELECT USING (status = 'published');
CREATE POLICY "items_owner_read" ON public.ecosystem_items FOR SELECT TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "items_admin_read" ON public.ecosystem_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "items_owner_insert" ON public.ecosystem_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "items_owner_update" ON public.ecosystem_items FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "items_owner_delete" ON public.ecosystem_items FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE TRIGGER items_updated_at BEFORE UPDATE ON public.ecosystem_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_items_category ON public.ecosystem_items(category);
CREATE INDEX idx_items_author ON public.ecosystem_items(author_id);
CREATE INDEX idx_items_status ON public.ecosystem_items(status);
CREATE INDEX idx_items_marketplace ON public.ecosystem_items(marketplace_published);
CREATE INDEX idx_items_created ON public.ecosystem_items(created_at DESC);

-- ============ ITEM VERSIONS ============
CREATE TABLE public.item_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.ecosystem_items(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  description TEXT,
  content JSONB,
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_versions TO authenticated;
GRANT SELECT ON public.item_versions TO anon;
GRANT ALL ON public.item_versions TO service_role;
ALTER TABLE public.item_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions_public_read" ON public.item_versions FOR SELECT USING (true);
CREATE POLICY "versions_owner_write" ON public.item_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ecosystem_items i WHERE i.id = item_id AND i.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ecosystem_items i WHERE i.id = item_id AND i.author_id = auth.uid()));

-- ============ LIKES ============
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.ecosystem_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT SELECT ON public.likes TO anon;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_public_read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_likes_item ON public.likes(item_id);
CREATE INDEX idx_likes_user ON public.likes(user_id);

CREATE OR REPLACE FUNCTION public.sync_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ecosystem_items SET likes_count = likes_count + 1 WHERE id = NEW.item_id;
    RETURN NEW;
  ELSE
    UPDATE public.ecosystem_items SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.item_id;
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER likes_count_sync AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.sync_likes_count();

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.ecosystem_items(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_delete_own_or_item_owner" ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.ecosystem_items i WHERE i.id = item_id AND i.author_id = auth.uid()));
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_comments_item ON public.comments(item_id);

CREATE OR REPLACE FUNCTION public.sync_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ecosystem_items SET comments_count = comments_count + 1 WHERE id = NEW.item_id;
    RETURN NEW;
  ELSE
    UPDATE public.ecosystem_items SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.item_id;
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER comments_count_sync AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.sync_comments_count();

-- ============ FOLLOWS ============
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_public_read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- ============ AI SESSIONS ============
CREATE TABLE public.ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  status public.ai_session_status NOT NULL DEFAULT 'active',
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  events_count INTEGER NOT NULL DEFAULT 0,
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_sessions TO authenticated;
GRANT ALL ON public.ai_sessions TO service_role;
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_sessions_read_own" ON public.ai_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.ai_sessions(session_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_events TO authenticated;
GRANT ALL ON public.ai_events TO service_role;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_events_read_own" ON public.ai_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_sessions s WHERE s.session_id = ai_events.session_id AND s.user_id = auth.uid()));
CREATE INDEX idx_ai_events_session ON public.ai_events(session_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read);

-- ============ ANALYTICS ============
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  item_id UUID,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_admin_read" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_analytics_item ON public.analytics_events(item_id, event_type);
CREATE INDEX idx_analytics_created ON public.analytics_events(created_at DESC);

-- ============ RATE LIMITS ============
CREATE TABLE public.rate_limits (
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key TEXT, _limit INT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w TIMESTAMPTZ := date_trunc('minute', now()); c INT;
BEGIN
  INSERT INTO public.rate_limits (bucket_key, window_start, hits)
  VALUES (_key, w, 1)
  ON CONFLICT (bucket_key, window_start) DO UPDATE SET hits = public.rate_limits.hits + 1
  RETURNING hits INTO c;
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '10 minutes';
  RETURN c <= _limit;
END; $$;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT) FROM PUBLIC, anon, authenticated;

-- ============ COUNTER HELPERS ============
CREATE OR REPLACE FUNCTION public.increment_item_counter(_item_id UUID, _column TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _column = 'views_count' THEN
    UPDATE public.ecosystem_items SET views_count = views_count + 1 WHERE id = _item_id;
  ELSIF _column = 'downloads_count' THEN
    UPDATE public.ecosystem_items SET downloads_count = downloads_count + 1 WHERE id = _item_id;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.increment_item_counter(UUID, TEXT) FROM PUBLIC, anon, authenticated;