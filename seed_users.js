/**
 * SEED SCRIPT: Three Users — 14-Day Wellness Descent
 * =====================================================
 * Creates 3 demo student users in Supabase Auth + all linked DB tables.
 * Week 1: Healthy baseline (wellness ~65-80%)
 * Week 2: Progressive decline into sub-45% territory
 *
 * Run: node seed_users.js
 * Requirements: npm install @supabase/supabase-js
 *
 * NOTE: Uses the service_role key (set SUPABASE_SERVICE_KEY env var),
 *       The script creates auth users via supabase.auth.admin.createUser()
 *       which requires the SERVICE ROLE KEY.
 *
 *       Set it: $env:SUPABASE_SERVICE_KEY="your-service-role-key"
 *       Then run: node seed_users.js
 */

import { createClient } from '@supabase/supabase-js';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://tuqedzkoczppiafjfwtk.supabase.co';

// You MUST supply a service_role key to create auth users via admin API.
// Get it from: Supabase Dashboard → Project Settings → API → service_role key
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('\n ERROR: SUPABASE_SERVICE_KEY environment variable is not set.');
  console.error('   Set it in PowerShell with:');
  console.error('   $env:SUPABASE_SERVICE_KEY="your-service-role-secret-key"');
  console.error('   Then re-run: node seed_users.js\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── USER DEFINITIONS ────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    email: 'amirah.student@mindtrack.demo',
    password: 'MindTrack2026!',
    full_name: 'Amirah Zulkifli',
    role: 'user',
  },
  {
    email: 'haziq.student@mindtrack.demo',
    password: 'MindTrack2026!',
    full_name: 'Haziq Rahimi',
    role: 'user',
  },
  {
    email: 'nurin.student@mindtrack.demo',
    password: 'MindTrack2026!',
    full_name: 'Nurin Farhana',
    role: 'user',
  },
];

// ─── 14-DAY DATA PROFILES ────────────────────────────────────────────────────
// Each entry: { mood, sleep_start, sleep_end, water_glasses, exercise_mins, study_mins }
// mood: 1=Very Sad, 2=Sad, 3=Neutral, 4=Happy, 5=Very Happy
// Week 1 (days 0-6): healthy baseline -> Week 2 (days 7-13): decline

const USER_PROFILES = [
  // User 0: Amirah — Emotional volatility + circadian chaos
  // Week 2 design: mood swings 4↔1 (high MSSD → low Mc) + wildly alternating bedtimes (large σ → low Sc)
  [
    // Week 1 — healthy and stable
    { mood: 4, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 8,  exercise_mins: 45, study_mins: 90  },
    { mood: 4, sleep_start: '23:30', sleep_end: '07:30', water_glasses: 7,  exercise_mins: 30, study_mins: 120 },
    { mood: 5, sleep_start: '22:30', sleep_end: '07:00', water_glasses: 9,  exercise_mins: 60, study_mins: 60  },
    { mood: 4, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 8,  exercise_mins: 40, study_mins: 100 },
    { mood: 3, sleep_start: '23:30', sleep_end: '07:30', water_glasses: 7,  exercise_mins: 20, study_mins: 150 },
    { mood: 4, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 8,  exercise_mins: 50, study_mins: 80  },
    { mood: 5, sleep_start: '22:30', sleep_end: '07:30', water_glasses: 8,  exercise_mins: 45, study_mins: 90  },
    // Week 2 — emotional chaos + circadian disruption
    // Volatile moods (big swings) → high MSSD → Mc plummets
    // Erratic bedtimes swinging 23:00 ↔ 04:00 → huge σ_bed → Sc plummets
    { mood: 4, sleep_start: '23:00', sleep_end: '08:00', water_glasses: 3,  exercise_mins: 0,  study_mins: 180 },
    { mood: 1, sleep_start: '04:00', sleep_end: '07:00', water_glasses: 2,  exercise_mins: 0,  study_mins: 220 },
    { mood: 4, sleep_start: '23:30', sleep_end: '08:30', water_glasses: 3,  exercise_mins: 0,  study_mins: 200 },
    { mood: 1, sleep_start: '04:30', sleep_end: '07:30', water_glasses: 2,  exercise_mins: 0,  study_mins: 240 },
    { mood: 4, sleep_start: '23:00', sleep_end: '08:00', water_glasses: 3,  exercise_mins: 0,  study_mins: 210 },
    { mood: 1, sleep_start: '04:00', sleep_end: '07:00', water_glasses: 2,  exercise_mins: 0,  study_mins: 230 },
    { mood: 2, sleep_start: '04:30', sleep_end: '07:30', water_glasses: 2,  exercise_mins: 0,  study_mins: 200 },
  ],

  // User 1: Haziq — Burnout with mood spikes + extreme circadian disorder
  // Week 2 design: mood yo-yos 5↔1 (maximum MSSD) + bedtimes swinging 4+ hours
  [
    // Week 1 — highly productive and stable
    { mood: 5, sleep_start: '22:00', sleep_end: '06:30', water_glasses: 9,  exercise_mins: 60, study_mins: 120 },
    { mood: 4, sleep_start: '22:30', sleep_end: '07:00', water_glasses: 8,  exercise_mins: 45, study_mins: 90  },
    { mood: 5, sleep_start: '22:00', sleep_end: '06:30', water_glasses: 10, exercise_mins: 60, study_mins: 100 },
    { mood: 4, sleep_start: '22:30', sleep_end: '07:00', water_glasses: 8,  exercise_mins: 30, study_mins: 110 },
    { mood: 5, sleep_start: '22:00', sleep_end: '06:30', water_glasses: 9,  exercise_mins: 45, study_mins: 80  },
    { mood: 4, sleep_start: '22:30', sleep_end: '07:00', water_glasses: 9,  exercise_mins: 60, study_mins: 90  },
    { mood: 5, sleep_start: '22:00', sleep_end: '07:00', water_glasses: 8,  exercise_mins: 30, study_mins: 100 },
    // Week 2 — sudden total breakdown: energy spikes followed by crashes
    { mood: 5, sleep_start: '22:00', sleep_end: '08:30', water_glasses: 3,  exercise_mins: 0,  study_mins: 60  },
    { mood: 1, sleep_start: '04:30', sleep_end: '07:30', water_glasses: 2,  exercise_mins: 0,  study_mins: 300 },
    { mood: 5, sleep_start: '22:30', sleep_end: '09:00', water_glasses: 3,  exercise_mins: 0,  study_mins: 50  },
    { mood: 1, sleep_start: '05:00', sleep_end: '07:30', water_glasses: 2,  exercise_mins: 0,  study_mins: 310 },
    { mood: 5, sleep_start: '22:00', sleep_end: '08:30', water_glasses: 3,  exercise_mins: 0,  study_mins: 60  },
    { mood: 1, sleep_start: '04:30', sleep_end: '07:30', water_glasses: 2,  exercise_mins: 0,  study_mins: 280 },
    { mood: 1, sleep_start: '05:00', sleep_end: '08:00', water_glasses: 2,  exercise_mins: 0,  study_mins: 260 },
  ],

  // User 2: Nurin — Gradual emotional dysregulation + circadian drift
  // Week 2 design: mood oscillates 3↔1 + bedtimes drift and swing erratically
  [
    // Week 1 — moderate but acceptable
    { mood: 4, sleep_start: '23:30', sleep_end: '07:30', water_glasses: 7,  exercise_mins: 30, study_mins: 100 },
    { mood: 3, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 6,  exercise_mins: 30, study_mins: 120 },
    { mood: 4, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 7,  exercise_mins: 45, study_mins: 90  },
    { mood: 4, sleep_start: '23:30', sleep_end: '07:30', water_glasses: 7,  exercise_mins: 30, study_mins: 80  },
    { mood: 3, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 6,  exercise_mins: 20, study_mins: 130 },
    { mood: 4, sleep_start: '23:30', sleep_end: '07:30', water_glasses: 7,  exercise_mins: 30, study_mins: 150 },
    { mood: 3, sleep_start: '23:00', sleep_end: '07:00', water_glasses: 6,  exercise_mins: 20, study_mins: 160 },
    // Week 2 — dysregulation spiral: mood instability + chaotic sleep timing
    { mood: 3, sleep_start: '23:30', sleep_end: '07:30', water_glasses: 3,  exercise_mins: 0,  study_mins: 180 },
    { mood: 1, sleep_start: '04:00', sleep_end: '08:00', water_glasses: 2,  exercise_mins: 0,  study_mins: 210 },
    { mood: 4, sleep_start: '23:00', sleep_end: '08:00', water_glasses: 3,  exercise_mins: 0,  study_mins: 190 },
    { mood: 1, sleep_start: '04:30', sleep_end: '07:30', water_glasses: 2,  exercise_mins: 0,  study_mins: 220 },
    { mood: 3, sleep_start: '23:00', sleep_end: '07:30', water_glasses: 3,  exercise_mins: 0,  study_mins: 200 },
    { mood: 1, sleep_start: '04:00', sleep_end: '07:30', water_glasses: 2,  exercise_mins: 0,  study_mins: 180 },
    { mood: 2, sleep_start: '04:30', sleep_end: '07:30', water_glasses: 2,  exercise_mins: 0,  study_mins: 150 },
  ],
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

  // Mc: Mood Consistency Index (MSSD)
  let mc = 1.0;
  const moodPairs = [];
  for (let i = 0; i < window.length - 1; i++) {
    const a = window[i];
    const b = window[i + 1];
    if (a.mood && b.mood) moodPairs.push(Math.pow(b.mood - a.mood, 2));
  }
  if (moodPairs.length > 0) {
    const mssd = moodPairs.reduce((s, v) => s + v, 0) / moodPairs.length;
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
      const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (arr.length - 1);
      return Math.sqrt(variance);
    };
    const sBed = bedtimes.length >= 2 ? stdDev(bedtimes) : 0;
    const sWake = waketimes.length >= 2 ? stdDev(waketimes) : 0;
    const totalSigma = (bedtimes.length >= 2 && waketimes.length >= 2) ? (sBed + sWake) : (sBed || sWake);
    sc = Math.max(0, Math.min(1, 1 - totalSigma / 4.0));
  }

  // Hc: Hydration Consistency
  const sumCappedLiters = window.reduce((s, d) => s + Math.min((d.water_glasses * 0.25) || 0, 2.0), 0);
  const hc = Math.max(0, Math.min(1, sumCappedLiters / (7 * 2.0)));

  // Ec: Exercise Consistency
  const exerciseSessions = window.filter(d => d.exercise_mins > 0).length;
  const ec = Math.max(0, Math.min(1, exerciseSessions / 3.0));

  const rawScore = (mc * 0.4 + sc * 0.3 + hc * 0.1 + ec * 0.2) * 100;
  return {
    wellness_score: Math.round(rawScore),
    mood_consistency: parseFloat(mc.toFixed(3)),
    sleep_consistency: parseFloat(sc.toFixed(3)),
    hydration_consistency: parseFloat(hc.toFixed(3)),
    exercise_consistency: parseFloat(ec.toFixed(3)),
  };
}

// ─── NOTE GENERATOR ──────────────────────────────────────────────────────────
function generateNotes(mood, dayIdx) {
  const week1Notes = [
    'Felt energised today, had a productive morning session.',
    'Good day overall, managed to stay on top of things.',
    'Really happy with how the week is going. Slept well.',
    'Balanced day, kept hydrated and got some exercise in.',
    'Feeling good and on top of things.',
    'Good recovery day. Feeling grounded and motivated.',
    'End of week — feeling accomplished and rested.',
  ];
  const week2Notes = [
    'Hard to explain — felt strangely OK during the day but crashed hard at night.',
    'Could not sleep at all. Felt completely detached and hollow when morning came.',
    'Random burst of energy then nothing. Slept early to escape. Confused.',
    'Wired at 4AM for no reason. Could not wind down. Feel broken.',
    'Felt almost fine during the afternoon then it all collapsed again.',
    'Another night where I just could not sleep at a normal time. Body feels out of sync.',
    'Exhausted but restless. Running on empty. Cannot keep doing this.',
  ];
  if (dayIdx < 7) return week1Notes[dayIdx] || '';
  return week2Notes[dayIdx - 7] || '';
}

// ─── MAIN SEED FUNCTION ───────────────────────────────────────────────────────
async function seedUsers() {
  console.log('\n MindTrack Seed Script — 3 Users x 14 Days (Wellness Descent)\n');

  for (let ui = 0; ui < DEMO_USERS.length; ui++) {
    const userDef = DEMO_USERS[ui];
    const dayProfile = USER_PROFILES[ui];

    console.log(`\n Processing: ${userDef.full_name} (${userDef.email})`);

    // 1. Create or find existing Auth User
    let authUserId;
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users?.find(u => u.email === userDef.email);

    if (existing) {
      authUserId = existing.id;
      console.log(`   [SKIP] Auth user already exists, reusing: ${authUserId}`);
    } else {
      const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
        email: userDef.email,
        password: userDef.password,
        email_confirm: true,
        user_metadata: { full_name: userDef.full_name },
      });

      if (authErr) {
        console.error(`   [ERROR] Failed to create auth user: ${authErr.message}`);
        continue;
      }
      authUserId = newUser.user.id;
      console.log(`   [OK] Auth user created: ${authUserId}`);
    }

    // 2. Upsert Profile Row
    const { error: profileErr } = await supabase.from('profile').upsert({
      id: authUserId,
      full_name: userDef.full_name,
      role: userDef.role,
    }, { onConflict: 'id' });

    if (profileErr) {
      console.error(`   [ERROR] Profile upsert failed: ${profileErr.message}`);
      continue;
    }
    console.log(`   [OK] Profile row upserted`);

    // 3. Clean up existing seed data
    await supabase.from('mood_entry').delete().eq('profile_id', authUserId);
    console.log(`   [CLEAR] Previous mood entries removed`);

    // 4. Insert 14 days of data
    const cumulativeDayWindow = [];

    for (let dayIdx = 0; dayIdx < 14; dayIdx++) {
      const daysAgo = 13 - dayIdx;
      const dateStr = getDateISO(daysAgo);
      const timestamp = `${dateStr}T12:00:00`;
      const entry = dayProfile[dayIdx];

      const sleepHours = computeSleepHours(entry.sleep_start, entry.sleep_end);

      const [sh, sm] = entry.sleep_start.split(':').map(Number);
      let sleepStartDec = sh + sm / 60;
      if (sh < 12) sleepStartDec += 24;

      const [eh, em] = entry.sleep_end.split(':').map(Number);
      let sleepEndDec = eh + em / 60;
      if (sleepEndDec <= sleepStartDec) sleepEndDec += 24;

      cumulativeDayWindow.push({
        mood: entry.mood,
        sleep_hours: sleepHours,
        sleep_start_dec: sleepStartDec,
        sleep_end_dec: sleepEndDec,
        water_glasses: entry.water_glasses,
        exercise_mins: entry.exercise_mins,
      });

      // Insert mood_entry
      const { data: moodRow, error: moodErr } = await supabase
        .from('mood_entry')
        .insert([{
          profile_id: authUserId,
          mood_id: entry.mood,
          notes: generateNotes(entry.mood, dayIdx),
          created_at: timestamp,
        }])
        .select()
        .single();

      if (moodErr) {
        console.error(`   [ERROR] Day ${dayIdx + 1} mood_entry: ${moodErr.message}`);
        continue;
      }

      // Sleep activity
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

      // Water activity
      const waterLiters = parseFloat((entry.water_glasses * 0.25).toFixed(2));
      const { data: waterLog } = await supabase
        .from('activity_log')
        .insert([{ mood_entry_id: moodRow.id, activity_type: 'Water' }])
        .select().single();

      if (waterLog) {
        await supabase.from('water_activity').insert([{
          activity_id: waterLog.id,
          glasses_count: entry.water_glasses,
          liters_consumed: waterLiters,
        }]);
      }

      // Exercise activity (only if > 0 mins)
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

      // Study activity (only if > 0 mins)
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

      // Wellness analysis snapshot
      const scores = computeWellnessScore(cumulativeDayWindow);
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

    console.log(`\n   [DONE] ${userDef.full_name} seeding complete.\n`);
  }

  console.log('\n All three demo users seeded successfully!\n');
  console.log('Login credentials:');
  DEMO_USERS.forEach(u => {
    console.log(`  - ${u.full_name}: ${u.email} / ${u.password}`);
  });
  console.log('\n');
}

seedUsers().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
