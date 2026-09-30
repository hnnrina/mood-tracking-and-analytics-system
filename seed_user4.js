/**
 * SEED SCRIPT: User 4 — Liyana Mazlan (Just Above 45% Threshold)
 * ================================================================
 * Creates one demo student sitting at ~52% wellness.
 * Designed so one manual "crisis" log entry will tip her below 45%.
 *
 * Run: node seed_user4.js
 * Requires: $env:SUPABASE_SERVICE_KEY="your-service-role-key"
 *
 * LOGIN: liyana.student@mindtrack.demo / MindTrack2026!
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tuqedzkoczppiafjfwtk.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('\n ERROR: Set $env:SUPABASE_SERVICE_KEY first.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── USER DEFINITION ─────────────────────────────────────────────────────────
const USER = {
  email: 'liyana.student@mindtrack.demo',
  password: 'MindTrack2026!',
  full_name: 'Liyana Mazlan',
  role: 'user',
};

// ─── 14-DAY DATA PROFILE ─────────────────────────────────────────────────────
//
// DESIGN GOAL: Last 7 days (Week 2) produce ~52% wellness score.
// One manual crisis entry by the user will shift the 7-day window
// and drop the score to ~38-40%, triggering the alert threshold.
//
// Week 2 target sub-indices:
//   Mc ≈ 0.79  (moods swing 3→2→4→1→3→2→3, MSSD ≈ 3.33)
//   Sc ≈ 0.55  (bedtimes alternate 23:00 ↔ 02:00, σ_bed ≈ 1.44)
//   Hc ≈ 0.43  (3–4 glasses/day, liters sum ≈ 6/14)
//   Ec ≈ 0.00  (zero exercise sessions)
//   Score ≈ (0.79×0.4 + 0.55×0.3 + 0.43×0.1 + 0×0.2) × 100 ≈ 52%
//
// After user adds: mood=1, sleep 03:00–06:30, water=2 glasses, no exercise:
//   Moods shift to: 2→4→1→3→2→3→1 → MSSD ≈ 5.33 → Mc ≈ 0.67
//   New Sc stays similar → Sc ≈ 0.50
//   Hc drops slightly → Hc ≈ 0.38
//   Score ≈ (0.67×0.4 + 0.50×0.3 + 0.38×0.1 + 0) × 100 ≈ 41% → SUB-45% ✅

const DAY_PROFILE = [
  // ── WEEK 1: Healthy & consistent (days 1–7, 13–7 days ago) ──────────────
  // Mood 3–5, regular sleep ~23:00-07:00, good hydration, some exercise
  { mood: 4, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 6, exercise_mins: 30, study_mins: 90  },
  { mood: 4, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 7, exercise_mins: 30, study_mins: 100 },
  { mood: 3, sleep_start: '23:30', sleep_end: '07:30', water_glasses: 6, exercise_mins: 0,  study_mins: 120 },
  { mood: 4, sleep_start: '23:00', sleep_end: '07:30', water_glasses: 7, exercise_mins: 30, study_mins: 100 },
  { mood: 5, sleep_start: '22:30', sleep_end: '07:00', water_glasses: 8, exercise_mins: 45, study_mins: 80  },
  { mood: 4, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 7, exercise_mins: 0,  study_mins: 110 },
  { mood: 3, sleep_start: '23:30', sleep_end: '07:30', water_glasses: 6, exercise_mins: 30, study_mins: 100 },

  // ── WEEK 2: Early warning signs — irregular sleep, mood dipping (days 8–14) ──
  // Bedtimes alternate 23:00 ↔ 02:00 (circadian drift starting)
  // Moods oscillate 3→2→4→1→3→2→3 (instability creeping in)
  // Zero exercise, reduced hydration
  { mood: 3, sleep_start: '23:00', sleep_end: '07:30', water_glasses: 3, exercise_mins: 0, study_mins: 150 },
  { mood: 2, sleep_start: '02:00', sleep_end: '08:00', water_glasses: 4, exercise_mins: 0, study_mins: 180 },
  { mood: 4, sleep_start: '23:00', sleep_end: '07:30', water_glasses: 3, exercise_mins: 0, study_mins: 160 },
  { mood: 1, sleep_start: '02:00', sleep_end: '08:00', water_glasses: 4, exercise_mins: 0, study_mins: 200 },
  { mood: 3, sleep_start: '23:00', sleep_end: '07:30', water_glasses: 3, exercise_mins: 0, study_mins: 170 },
  { mood: 2, sleep_start: '01:30', sleep_end: '08:00', water_glasses: 4, exercise_mins: 0, study_mins: 190 },
  { mood: 3, sleep_start: '00:00', sleep_end: '08:30', water_glasses: 3, exercise_mins: 0, study_mins: 160 },
];

// Journal notes for each day
const NOTES = [
  // Week 1
  'Good start to the week, feeling focused and energised.',
  'Productive day. Managing well with studies.',
  'Slightly tired today but pulled through.',
  'Back on track. Feeling balanced.',
  'Best day this week. Slept really well and felt motivated.',
  'Restful day. Feeling grateful.',
  'Wrapping up the week on a decent note.',
  // Week 2
  'Starting to feel the academic pressure building up.',
  'Could not fall asleep until very late. Felt groggy all morning.',
  'Had a decent afternoon but the night was disruptive again.',
  'Really struggled today. Felt low and unmotivated. Went to bed very late.',
  'Managed to sleep early but still tired from the inconsistent nights.',
  'Late night again. Feel like my body clock is all over the place.',
  'Feeling okay-ish. But this pattern of irregular sleep is wearing me down.',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getDateISO(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function computeSleepHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins < startMins) endMins += 24 * 60;
  return parseFloat(((endMins - startMins) / 60).toFixed(1));
}

function computeWellnessScore(daySlice) {
  const window = daySlice.slice(-7);

  // Mc: MSSD-based Mood Consistency
  let mc = 1.0;
  const pairs = [];
  for (let i = 0; i < window.length - 1; i++) {
    if (window[i].mood && window[i + 1].mood)
      pairs.push(Math.pow(window[i + 1].mood - window[i].mood, 2));
  }
  if (pairs.length > 0) {
    const mssd = pairs.reduce((s, v) => s + v, 0) / pairs.length;
    mc = Math.max(0, Math.min(1, 1 - mssd / 16.0));
  }

  // Sc: Sleep Regularity Index
  let sc = 1.0;
  const bedtimes = window.filter(d => d.sleep_start_dec !== null).map(d => d.sleep_start_dec);
  const waketimes = window.filter(d => d.sleep_end_dec !== null).map(d => d.sleep_end_dec);
  if (bedtimes.length >= 2 || waketimes.length >= 2) {
    const stdDev = (arr) => {
      if (arr.length < 2) return 0;
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (arr.length - 1));
    };
    const totalSigma = (bedtimes.length >= 2 && waketimes.length >= 2)
      ? stdDev(bedtimes) + stdDev(waketimes)
      : (stdDev(bedtimes) || stdDev(waketimes));
    sc = Math.max(0, Math.min(1, 1 - totalSigma / 4.0));
  }

  // Hc: Hydration Consistency
  const sumCappedLiters = window.reduce((s, d) => s + Math.min((d.water_glasses * 0.25) || 0, 2.0), 0);
  const hc = Math.max(0, Math.min(1, sumCappedLiters / (7 * 2.0)));

  // Ec: Exercise Consistency
  const ec = Math.max(0, Math.min(1, window.filter(d => d.exercise_mins > 0).length / 3.0));

  return {
    wellness_score: Math.round((mc * 0.4 + sc * 0.3 + hc * 0.1 + ec * 0.2) * 100),
    mood_consistency: parseFloat(mc.toFixed(3)),
    sleep_consistency: parseFloat(sc.toFixed(3)),
    hydration_consistency: parseFloat(hc.toFixed(3)),
    exercise_consistency: parseFloat(ec.toFixed(3)),
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function seedUser4() {
  console.log('\n MindTrack — Seeding User 4: Liyana Mazlan (threshold demo)\n');

  // 1. Auth user
  let authUserId;
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === USER.email);

  if (existing) {
    authUserId = existing.id;
    console.log(`   [SKIP] Auth user already exists: ${authUserId}`);
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: USER.email,
      password: USER.password,
      email_confirm: true,
      user_metadata: { full_name: USER.full_name },
    });
    if (error) { console.error(`   [ERROR] ${error.message}`); process.exit(1); }
    authUserId = newUser.user.id;
    console.log(`   [OK] Auth user created: ${authUserId}`);
  }

  // 2. Profile upsert
  await supabase.from('profile').upsert(
    { id: authUserId, full_name: USER.full_name, role: USER.role },
    { onConflict: 'id' }
  );
  console.log(`   [OK] Profile row upserted`);

  // 3. Clear existing data
  await supabase.from('mood_entry').delete().eq('profile_id', authUserId);
  console.log(`   [CLEAR] Previous mood entries removed`);

  // 4. Insert 14 days
  const cumulativeWindow = [];

  for (let dayIdx = 0; dayIdx < 14; dayIdx++) {
    const daysAgo = 13 - dayIdx;
    const dateStr = getDateISO(daysAgo);
    const timestamp = `${dateStr}T12:00:00`;
    const entry = DAY_PROFILE[dayIdx];

    const sleepHours = computeSleepHours(entry.sleep_start, entry.sleep_end);

    const [sh, sm] = entry.sleep_start.split(':').map(Number);
    let sleepStartDec = sh + sm / 60;
    if (sh < 12) sleepStartDec += 24;

    const [eh, em] = entry.sleep_end.split(':').map(Number);
    let sleepEndDec = eh + em / 60;
    if (sleepEndDec <= sleepStartDec) sleepEndDec += 24;

    cumulativeWindow.push({
      mood: entry.mood,
      sleep_hours: sleepHours,
      sleep_start_dec: sleepStartDec,
      sleep_end_dec: sleepEndDec,
      water_glasses: entry.water_glasses,
      exercise_mins: entry.exercise_mins,
    });

    // mood_entry
    const { data: moodRow, error: moodErr } = await supabase
      .from('mood_entry')
      .insert([{ profile_id: authUserId, mood_id: entry.mood, notes: NOTES[dayIdx] || '', created_at: timestamp }])
      .select().single();

    if (moodErr) { console.error(`   [ERROR] Day ${dayIdx + 1}: ${moodErr.message}`); continue; }

    // sleep_activity
    const { data: sleepLog } = await supabase
      .from('activity_log')
      .insert([{ mood_entry_id: moodRow.id, activity_type: 'Sleep' }])
      .select().single();
    if (sleepLog) {
      await supabase.from('sleep_activity').insert([{
        activity_id: sleepLog.id,
        start_time: entry.sleep_start,
        end_time: entry.sleep_end,
        duration_hours: sleepHours,
      }]);
    }

    // water_activity
    const { data: waterLog } = await supabase
      .from('activity_log')
      .insert([{ mood_entry_id: moodRow.id, activity_type: 'Water' }])
      .select().single();
    if (waterLog) {
      await supabase.from('water_activity').insert([{
        activity_id: waterLog.id,
        glasses_count: entry.water_glasses,
        liters_consumed: parseFloat((entry.water_glasses * 0.25).toFixed(2)),
      }]);
    }

    // exercise_activity (only if > 0)
    if (entry.exercise_mins > 0) {
      const { data: exLog } = await supabase
        .from('activity_log')
        .insert([{ mood_entry_id: moodRow.id, activity_type: 'Exercise' }])
        .select().single();
      if (exLog) {
        await supabase.from('exercise_activity').insert([{
          activity_id: exLog.id,
          exercise_type: 'Running',
          duration_minutes: entry.exercise_mins,
        }]);
      }
    }

    // study_activity (only if > 0)
    if (entry.study_mins > 0) {
      const studyEndHour = 9 + entry.study_mins / 60;
      const studyEndH = Math.floor(studyEndHour);
      const studyEndM = Math.round((studyEndHour - studyEndH) * 60);
      const studyEndStr = `${String(studyEndH).padStart(2, '0')}:${String(studyEndM).padStart(2, '0')}`;

      const { data: studyLog } = await supabase
        .from('activity_log')
        .insert([{ mood_entry_id: moodRow.id, activity_type: 'Study' }])
        .select().single();
      if (studyLog) {
        await supabase.from('study_activity').insert([{
          activity_id: studyLog.id,
          start_time: '09:00',
          end_time: studyEndStr,
          duration_minutes: entry.study_mins,
        }]);
      }
    }

    // wellness_analysis
    const scores = computeWellnessScore(cumulativeWindow);
    await supabase.from('wellness_analysis').insert([{
      profile_id: authUserId,
      mood_entry_id: moodRow.id,
      wellness_score: scores.wellness_score,
      mood_consistency: scores.mood_consistency,
      sleep_consistency: scores.sleep_consistency,
      hydration_consistency: scores.hydration_consistency,
      exercise_consistency: scores.exercise_consistency,
      created_at: timestamp,
    }]);

    const weekLabel = dayIdx < 7 ? 'W1' : 'W2';
    const flag = scores.wellness_score >= 45 ? '[OK] ' : '[LOW]';
    console.log(`   ${flag} Day ${String(dayIdx + 1).padStart(2, ' ')} [${weekLabel}] | Mood: ${entry.mood}/5 | Sleep: ${sleepHours}h | Water: ${entry.water_glasses}gl | Ex: ${entry.exercise_mins}m | Wellness: ${scores.wellness_score}%`);
  }

  console.log(`\n   [DONE] Liyana Mazlan seeded successfully.`);
  console.log(`\n   Login: ${USER.email} / ${USER.password}`);
  console.log(`\n   Current wellness: ~52% (just above the 45% alert threshold)`);
  console.log(`\n   To trigger the notification flow, log in as Liyana and submit:`);
  console.log(`     Mood     : 1 (Very Sad)`);
  console.log(`     Sleep    : ~03:00 – 06:30 (3.5h, very late)`);
  console.log(`     Water    : 2 glasses`);
  console.log(`     Exercise : none`);
  console.log(`   This will shift the 7-day window and drop her score to ~41% → sub-45% alert fires.\n`);
}

seedUser4().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
