-- Reminders table (polymorphic)
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('habit','task','pomodoro_phase','time_of_day')),
  target_id UUID,
  -- pomodoro_phase: 'work_end' | 'short_break_end' | 'long_break_end'
  -- time_of_day: slot_key holds the slot (morning/noon/...)
  target_key TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('absolute_time','before_slot','after_slot')),
  absolute_time TIME,
  slot_key TEXT,
  offset_minutes INTEGER NOT NULL DEFAULT 0,
  days_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  title TEXT,
  body TEXT,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  last_sent_for_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_user ON public.reminders(user_id);
CREATE INDEX idx_reminders_target ON public.reminders(target_type, target_id);
CREATE INDEX idx_reminders_enabled ON public.reminders(enabled) WHERE enabled = true;

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_reminders_updated_at
BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_label TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subs" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own subs" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subs" ON public.push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own subs" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- user_settings: notification toggles + quiet hours
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_habits BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_tasks BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_pomodoro BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul';

-- tasks: optional reminder lead-time in minutes (before due)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER;

-- Enable extensions for cron + http (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;