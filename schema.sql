
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  professional_id uuid,
  user_id uuid,
  user_agreed boolean DEFAULT false,
  professional_agreed boolean DEFAULT false,
  status character varying(50) DEFAULT 'assigned'::character varying,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id bigint NOT NULL DEFAULT nextval('activity_log_id_seq'::regclass),
  mood_entry_id bigint NOT NULL,
  activity_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_activity (
  id bigint NOT NULL DEFAULT nextval('exercise_activity_id_seq'::regclass),
  activity_id bigint NOT NULL,
  exercise_type text NOT NULL,
  duration_minutes integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mood (
  id integer NOT NULL,
  mood_name text NOT NULL,
  color_code text
);

CREATE TABLE IF NOT EXISTS public.mood_entry (
  id bigint NOT NULL DEFAULT nextval('mood_entry_id_seq'::regclass),
  profile_id uuid NOT NULL,
  mood_id integer NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid,
  notification_type text,
  title text,
  message text,
  severity_level text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  request_id uuid
);

CREATE TABLE IF NOT EXISTS public.profile (
  id uuid NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  avatar_url text
);

CREATE TABLE IF NOT EXISTS public.sleep_activity (
  id bigint NOT NULL DEFAULT nextval('sleep_activity_id_seq'::regclass),
  activity_id bigint NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  duration_hours numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS public.study_activity (
  id bigint NOT NULL DEFAULT nextval('study_activity_id_seq'::regclass),
  activity_id bigint NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  duration_minutes integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.system_recommendation (
  id bigint NOT NULL DEFAULT nextval('system_recommendation_id_seq'::regclass),
  analysis_id bigint NOT NULL,
  rule_id text NOT NULL,
  alert_severity text NOT NULL,
  message_content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id bigint NOT NULL DEFAULT nextval('verification_requests_id_seq'::regclass),
  professional_id uuid NOT NULL,
  profession_type text NOT NULL,
  license_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  document_url text
);

CREATE TABLE IF NOT EXISTS public.water_activity (
  id bigint NOT NULL DEFAULT nextval('water_activity_id_seq'::regclass),
  activity_id bigint NOT NULL,
  glasses_count integer NOT NULL,
  liters_consumed numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS public.wellness_analysis (
  id bigint NOT NULL DEFAULT nextval('wellness_analysis_id_seq'::regclass),
  profile_id uuid NOT NULL,
  mood_entry_id bigint NOT NULL,
  wellness_score integer NOT NULL,
  mood_consistency numeric DEFAULT 1.000,
  sleep_consistency numeric DEFAULT 1.000,
  hydration_consistency numeric DEFAULT 1.000,
  exercise_consistency numeric DEFAULT 1.000,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Users can update consensus flags on their assignments"" ON public.access_requests FOR UPDATE TO public USING (((auth.uid() = user_id) OR (auth.uid() = professional_id)));
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Users can view own profile"" ON public.profile FOR SELECT TO public USING ((auth.uid() = id));
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Users can update own profile"" ON public.profile FOR UPDATE TO public USING ((auth.uid() = id));
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Enable insertions for registration context"" ON public.verification_requests FOR INSERT TO public WITH CHECK (true);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Professionals can view own application status"" ON public.verification_requests FOR SELECT TO public USING ((auth.uid() = professional_id));
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Admins have total system visibility over applications"" ON public.verification_requests FOR ALL TO public USING ((( SELECT profile.role
   FROM profile
  WHERE (profile.id = auth.uid())) = 'admin'::text));
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Enable select access for authenticated users"" ON public.profile FOR SELECT TO authenticated USING (true);
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Allow users to read their own profiles"" ON public.profile FOR SELECT TO public USING ((auth.uid() = id));
ALTER TABLE public.mood_entry ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Enable CRUD for own mood entries"" ON public.mood_entry FOR ALL TO authenticated USING ((auth.uid() = profile_id));
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Enable CRUD for logs connected to own entries"" ON public.activity_log FOR ALL TO authenticated USING (true);
ALTER TABLE public.sleep_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Enable CRUD for sleep records"" ON public.sleep_activity FOR ALL TO authenticated USING (true);
ALTER TABLE public.water_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Enable CRUD for water records"" ON public.water_activity FOR ALL TO authenticated USING (true);
ALTER TABLE public.exercise_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Enable CRUD for exercise records"" ON public.exercise_activity FOR ALL TO authenticated USING (true);
ALTER TABLE public.study_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Enable CRUD for study records"" ON public.study_activity FOR ALL TO authenticated USING (true);
ALTER TABLE public.wellness_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Allow users CRUD access to their own analysis records"" ON public.wellness_analysis FOR ALL TO authenticated USING ((auth.uid() = profile_id));
ALTER TABLE public.system_recommendation ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Allow users CRUD access to recommendations via analysis link"" ON public.system_recommendation FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM wellness_analysis a
  WHERE ((a.id = system_recommendation.analysis_id) AND (a.profile_id = auth.uid())))));
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Users can view requests mapped to their profile"" ON public.access_requests FOR SELECT TO public USING (((auth.uid() = user_id) OR (auth.uid() = professional_id)));
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Admins can view all system monitoring alerts"" ON public.notifications FOR SELECT TO public USING (((notification_type = 'alert'::text) OR (auth.uid() = profile_id) OR (auth.uid() IN ( SELECT profile.id
   FROM profile
  WHERE (profile.role = 'admin'::text)))));
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Admins can insert new access requests"" ON public.access_requests FOR INSERT TO public WITH CHECK ((auth.uid() IN ( SELECT profile.id
   FROM profile
  WHERE (profile.role = 'admin'::text))));
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Admins can view all access requests for auditing"" ON public.access_requests FOR SELECT TO public USING ((auth.uid() IN ( SELECT profile.id
   FROM profile
  WHERE (profile.role = 'admin'::text))));
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Admins can insert notifications for users"" ON public.notifications FOR INSERT TO public WITH CHECK ((auth.uid() IN ( SELECT profile.id
   FROM profile
  WHERE (profile.role = 'admin'::text))));
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Users can view their own notifications"" ON public.notifications FOR SELECT TO public USING ((auth.uid() = profile_id));
ALTER TABLE public.mood_entry ENABLE ROW LEVEL SECURITY;
CREATE POLICY ""Allow owners and verified assigned professionals to view mood e"" ON public.mood_entry FOR SELECT TO public USING (((auth.uid() = profile_id) OR (auth.uid() IN ( SELECT access_requests.professional_id
   FROM access_requests
  WHERE ((access_requests.user_id = mood_entry.profile_id) AND ((access_requests.status)::text = 'active'::text))))));