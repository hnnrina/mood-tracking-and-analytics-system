// src/engine/wellnessRulesEngine.js
/**
 * CENTRALIZED WELLNESS RULES & ANALYTICS ENGINE
 * Pure utility module consolidating all deterministic rules, index formulas,
 * calendar day normalization, and insight generators.
 */

// ============================================================================
// 1. RULE CONSTANTS DICTIONARY & SEVERITIES
// ============================================================================
export const SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  POSITIVE: 'positive'
};

export const RULE_CONSTANTS = {
  // Mood Analytics (MT)
  MT1: {
    id: 'MT1',
    name: 'Low Mood Streak',
    severity: SEVERITIES.HIGH,
    message: 'Low Mood Streak: Emotional stability indicators have been downcast for 3 consecutive days. Recommend stress management, rest, and review with a practitioner.'
  },
  MT2: {
    id: 'MT2',
    name: 'Positive Mood Trend',
    severity: SEVERITIES.POSITIVE,
    message: 'Positive Mood Trend: Your average emotional rating improved by +1 level compared to last week.'
  },
  MT3: {
    id: 'MT3',
    name: 'Sudden Mood Drop',
    severity: SEVERITIES.HIGH,
    message: 'Sudden Mood Drop: Metric dropped sharply by >= 2 levels in 1 day. Immediate reflection prompt & self-care recommended.'
  },

  // Sleep Analytics (SL)
  SL1: {
    id: 'SL1',
    name: 'Severe Sleep Crunch',
    severity: SEVERITIES.MEDIUM,
    message: 'Critical Sleep Deficit: High cognitive deprivation detected. Recommend standard rest intervals and relaxation protocols.'
  },
  SL2: {
    id: 'SL2',
    name: 'Circadian Instability',
    severity: SEVERITIES.MEDIUM,
    message: 'Circadian Rhythm Instability Detected: Sleep onset boundary drifted significantly. Erratic bedtimes penalize emotional recovery.'
  },
  SL3: {
    id: 'SL3',
    name: 'Positive Sleep Correlation',
    severity: SEVERITIES.POSITIVE,
    message: 'Positive Sleep Correlation: Days with 7+ hours of sleep show noticeably higher average mood scores.'
  },
  SL4: {
    id: 'SL4',
    name: 'Oversleeping Pattern',
    severity: SEVERITIES.LOW,
    message: 'Oversleeping Pattern: Prolonged sleep duration exceeding 10 hours detected over consecutive days.'
  },

  // Hydration Analytics (HY)
  HY1: {
    id: 'HY1',
    name: 'Low Hydration Deficit',
    severity: SEVERITIES.LOW,
    message: 'Low Hydration: Mild dehydration risk. Recommend increasing daily water intake to protect daytime energy.'
  },
  HY2: {
    id: 'HY2',
    name: 'Positive Hydration Correlation',
    severity: SEVERITIES.POSITIVE,
    message: 'Positive Hydration Correlation: Optimal hydration days strongly correlate with improved mood ratings.'
  },

  // Exercise Analytics (EX)
  EX1: {
    id: 'EX1',
    name: 'Sedentary Drop',
    severity: SEVERITIES.LOW,
    message: 'Minimal Activity Alert: Sub-baseline physical output detected. Recommend engaging in light active recovery or movement.'
  },
  EX2: {
    id: 'EX2',
    name: 'Positive Exercise Correlation',
    severity: SEVERITIES.POSITIVE,
    message: 'Positive Exercise Correlation: Active movement days correlate with higher emotional stability.'
  },
  EX3: {
    id: 'EX3',
    name: 'Sudden Exercise Reduction',
    severity: SEVERITIES.LOW,
    message: 'Exercise Reduction Detected: Weekly physical activity dropped by 50% or more compared to the prior week.'
  },

  // Study & Cognitive Workload Analytics (ST)
  ST1: {
    id: 'ST1',
    name: 'Burnout Risk / Workload Variance',
    severity: SEVERITIES.HIGH,
    message: 'Burnout Risk / Workload Variance Warning: Cognitive workload is elevated while physical activation is low. Recommend balanced breaks.'
  },
  ST2: {
    id: 'ST2',
    name: 'Academic Stress Pattern',
    severity: SEVERITIES.LOW,
    message: 'Academic Stress Pattern: Extended focus study sessions correlate with temporary mood declines. Schedule mental recovery.'
  },

  // Wellness Combination Rules (WL)
  WL1: {
    id: 'WL1',
    name: 'Behavioral Instability',
    severity: SEVERITIES.HIGH,
    message: 'Behavioral Instability: Overlapping physical & emotional risks detected over 72h. Deploy counselor interface / priority support option.'
  },
  WL2: {
    id: 'WL2',
    name: 'Positive Wellness Pattern',
    severity: SEVERITIES.POSITIVE,
    message: 'Healthy Wellness Pattern: Excellent balance across sleep, hydration, movement, and emotional health.'
  }
};

// ============================================================================
// 2. HELPER UTILITIES & DATE NORMALIZATION
// ============================================================================

/**
 * Calculates Population Standard Deviation
 */
export const calculateStdDev = (values) => {
  if (!values || values.length < 2) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

/**
 * Formats a decimal hour (e.g. 23.5) into readable 12-hour string (e.g. "11:30 PM")
 */
export const formatDecimalHourTo12h = (dec) => {
  if (dec === undefined || dec === null || isNaN(dec)) return '';
  let hours = Math.floor(dec);
  const mins = Math.round((dec - hours) * 60);
  if (hours >= 24) hours -= 24;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  const minuteStr = mins > 0 ? `:${mins < 10 ? '0' + mins : mins}` : '';
  return `${displayHours}${minuteStr} ${ampm}`;
};

/**
 * Maps raw database mood entries across an explicit, continuous calendar date window.
 * Ensures missing days in logging explicitly output null/0 so denominators remain accurate.
 * 
 * @param {Array} rawLogs - Array of database log objects
 * @param {number} daysCount - Number of continuous calendar days (e.g., 7 or 30)
 * @param {Date} endDate - Target end date (defaults to today)
 * @returns {Array} Continuous array of normalized day objects ordered chronologically
 */
export const normalizeCalendarDays = (rawLogs = [], daysCount = 7, endDate = new Date()) => {
  const result = [];
  const logMapByDate = {};

  // Build lookup dictionary by YYYY-MM-DD
  rawLogs.forEach(log => {
    if (log.created_at) {
      const dateKey = new Date(log.created_at).toISOString().split('T')[0];
      // Keep most recent log if multiple entries exist on the same day
      logMapByDate[dateKey] = log;
    }
  });

  const endMs = endDate.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Generate continuous calendar days from (endDate - daysCount + 1) to endDate
  for (let i = daysCount - 1; i >= 0; i--) {
    const currentMs = endMs - (i * oneDayMs);
    const dObj = new Date(currentMs);
    const dateKey = dObj.toISOString().split('T')[0];
    const displayDateStr = dObj.toLocaleDateString('default', { month: 'short', day: 'numeric' });

    const rawLog = logMapByDate[dateKey];
    if (rawLog) {
      const sleepObj = rawLog.subActivities?.sleep;
      const waterObj = rawLog.subActivities?.water;
      const exerciseObj = rawLog.subActivities?.exercise;
      const studyObj = rawLog.subActivities?.study;

      let sleepStartDec = null;
      let sleepEndDec = null;
      let sleepHours = 0;

      if (sleepObj?.start_time && sleepObj?.end_time) {
        const [sH, sM] = sleepObj.start_time.split(':').map(Number);
        sleepStartDec = sH + (sM / 60);
        if (sH < 12) sleepStartDec += 24;

        const [eH, eM] = sleepObj.end_time.split(':').map(Number);
        sleepEndDec = eH + (eM / 60);
        if (sleepEndDec <= sleepStartDec) sleepEndDec += 24;

        sleepHours = parseFloat((sleepEndDec - sleepStartDec).toFixed(1));
      } else if (sleepObj?.duration_hours) {
        sleepHours = parseFloat(sleepObj.duration_hours || 0);
      }

      const glasses = waterObj ? parseInt(waterObj.glasses_count || 0) : 0;
      const liters = waterObj?.liters_consumed 
        ? parseFloat(waterObj.liters_consumed) 
        : (glasses * 0.25);

      const exerciseMins = exerciseObj ? parseInt(exerciseObj.duration_minutes || 0) : 0;
      const studyMins = studyObj ? parseInt(studyObj.duration_minutes || 0) : 0;

      result.push({
        dateStr: displayDateStr,
        dateKey,
        hasLog: true,
        mood: rawLog.mood_id || null,
        sleepHours,
        sleepStartDecimal: sleepStartDec,
        sleepEndDecimal: sleepEndDec,
        waterLiters: liters,
        waterGlasses: glasses,
        exerciseMins,
        studyMins,
        rawLog
      });
    } else {
      // Explicit Missing Day Normalization
      result.push({
        dateStr: displayDateStr,
        dateKey,
        hasLog: false,
        mood: null,
        sleepHours: 0,
        sleepStartDecimal: null,
        sleepEndDecimal: null,
        waterLiters: 0,
        waterGlasses: 0,
        exerciseMins: 0,
        studyMins: 0,
        rawLog: null
      });
    }
  }

  return result;
};

// ============================================================================
// 3. MASTER COMPOSITE WELLNESS SCORE ENGINE
// ============================================================================

/**
 * Calculates Master Composite Wellness Score (0-100) and Sub-Indices (0.0 - 1.0)
 * 
 * Formula: Wellness Score = (Mc * 0.4 + Sc * 0.3 + Hc * 0.1 + Ec * 0.2) * 100
 * Academic study time is explicitly EXCLUDED from the score calculation.
 * 
 * @param {Array} continuousDaysData - Array of 7 continuous normalized day objects
 * @returns {Object} Composite score, sub-indices, and UI stat aggregates
 */
export const calculateWellnessScore = (continuousDaysData = []) => {
  const windowDays = continuousDaysData.slice(-7); // Ensure strict 7-day rolling window
  
  let avgSleep = 0, avgWater = 0, totalExercise = 0, totalStudy = 0;
  let sleepLoggedDays = 0, waterLoggedDays = 0;

  const validMoods = [];
  const sleepBedtimes = [];
  const sleepWaketimes = [];
  let sumCappedLiters = 0;
  let activeExerciseSessions = 0;

  windowDays.forEach(day => {
    if (day.hasLog && day.mood !== null) {
      validMoods.push(day.mood);
    }
    if (day.sleepHours > 0) {
      avgSleep += day.sleepHours;
      sleepLoggedDays++;
    }
    if (day.sleepStartDecimal !== null) sleepBedtimes.push(day.sleepStartDecimal);
    if (day.sleepEndDecimal !== null) sleepWaketimes.push(day.sleepEndDecimal);

    if (day.waterGlasses > 0 || day.waterLiters > 0) {
      avgWater += day.waterGlasses;
      waterLoggedDays++;
    }
    sumCappedLiters += Math.min(day.waterLiters || 0, 2.0);

    if (day.exerciseMins > 0) {
      totalExercise += day.exerciseMins;
      activeExerciseSessions++;
    }

    // Excluded from wellness score, tracked separately for academic progress
    totalStudy += day.studyMins || 0;
  });

  avgSleep = sleepLoggedDays > 0 ? parseFloat((avgSleep / sleepLoggedDays).toFixed(1)) : 0;
  avgWater = waterLoggedDays > 0 ? parseFloat((avgWater / waterLoggedDays).toFixed(1)) : 0;

  // --- INDEX 1: MOOD CONSISTENCY INDEX (Mc) - MSSD ---
  let mc = 1.0;
  let adjacentPairsCount = 0;
  let sumSquaredDiffs = 0;

  for (let i = 0; i < windowDays.length - 1; i++) {
    const dCurr = windowDays[i];
    const dNext = windowDays[i + 1];
    if (dCurr.hasLog && dCurr.mood !== null && dNext.hasLog && dNext.mood !== null) {
      sumSquaredDiffs += Math.pow(dNext.mood - dCurr.mood, 2);
      adjacentPairsCount++;
    }
  }

  if (adjacentPairsCount > 0) {
    const mssd = sumSquaredDiffs / adjacentPairsCount;
    mc = 1 - (mssd / 16.0);
    mc = Math.max(0.0, Math.min(1.0, mc));
  }

  // --- INDEX 2: SLEEP REGULARITY INDEX (Sc) ---
  let sc = 1.0;
  if (sleepBedtimes.length >= 2 || sleepWaketimes.length >= 2) {
    const sigmaBed = sleepBedtimes.length >= 2 ? parseFloat(calculateStdDev(sleepBedtimes).toFixed(3)) : 0;
    const sigmaWake = sleepWaketimes.length >= 2 ? parseFloat(calculateStdDev(sleepWaketimes).toFixed(3)) : 0;
    const totalSigma = (sleepBedtimes.length >= 2 && sleepWaketimes.length >= 2) 
      ? (sigmaBed + sigmaWake) 
      : (sigmaBed || sigmaWake);
    sc = 1 - (totalSigma / 4.0);
    sc = Math.max(0.0, Math.min(1.0, sc));
  }

  // --- INDEX 3: HYDRATION CONSISTENCY INDEX (Hc) ---
  let hc = sumCappedLiters / (7 * 2.0);
  hc = Math.max(0.0, Math.min(1.0, hc));

  // --- INDEX 4: EXERCISE CONSISTENCY INDEX (Ec) ---
  let ec = Math.min(activeExerciseSessions / 3.0, 1.0);
  ec = Math.max(0.0, Math.min(1.0, ec));

  // --- MASTER COMPOSITE WELLNESS SCORE ---
  const rawScore = (mc * 0.4 + sc * 0.3 + hc * 0.1 + ec * 0.2) * 100;
  const computedWellnessScore = Math.round(rawScore);

  return {
    computedWellnessScore: (validMoods.length > 0 || sleepLoggedDays > 0 || waterLoggedDays > 0 || activeExerciseSessions > 0) ? computedWellnessScore : 0,
    mc: Math.round(mc * 1000) / 1000,
    sc: Math.round(sc * 1000) / 1000,
    hc: Math.round(hc * 1000) / 1000,
    ec: Math.round(ec * 1000) / 1000,
    avgSleep,
    avgWater,
    totalExercise,
    totalStudy,
    sleepLoggedDays,
    waterLoggedDays,
    activeExerciseSessions
  };
};

// ============================================================================
// 4. DETERMINISTIC RULE EVALUATOR & INSIGHTS ENGINE
// ============================================================================

/**
 * Evaluates continuous calendar data against the complete Rule Matrix.
 * 
 * @param {Array} continuousDaysData - Array of normalized day objects
 * @returns {Array} Array of triggered alert objects
 */
export const evaluateRulesAndAlerts = (continuousDaysData = []) => {
  const alerts = [];
  if (!continuousDaysData || continuousDaysData.length === 0) return alerts;

  const rolling7 = continuousDaysData.slice(-7);
  const loggedDays = continuousDaysData.filter(d => d.hasLog);

  // A. MOOD ANALYTICS (MT)
  // Rule MT1: Low Mood Streak (mood <= 2 for >= 3 consecutive days)
  let lowMoodStreak = 0;
  let maxLowMoodStreak = 0;
  continuousDaysData.forEach(d => {
    if (d.hasLog && d.mood !== null && d.mood <= 2) {
      lowMoodStreak++;
      if (lowMoodStreak > maxLowMoodStreak) maxLowMoodStreak = lowMoodStreak;
    } else {
      lowMoodStreak = 0;
    }
  });
  if (maxLowMoodStreak >= 3) {
    alerts.push({
      ...RULE_CONSTANTS.MT1,
      isWarning: true
    });
  }

  // Rule MT3 / MT2 Revised: Sudden Mood Drop (mood_t <= mood_{t-1} - 2 between adjacent calendar days)
  for (let i = 0; i < continuousDaysData.length - 1; i++) {
    const dCurr = continuousDaysData[i];
    const dNext = continuousDaysData[i + 1];
    if (dCurr.hasLog && dCurr.mood !== null && dNext.hasLog && dNext.mood !== null) {
      if (dNext.mood <= dCurr.mood - 2) {
        alerts.push({
          ...RULE_CONSTANTS.MT3,
          isWarning: true
        });
        break;
      }
    }
  }

  // Rule MT2: Positive Mood Trend
  if (continuousDaysData.length >= 14) {
    const currentWeek = continuousDaysData.slice(-7).filter(d => d.hasLog && d.mood);
    const prevWeek = continuousDaysData.slice(-14, -7).filter(d => d.hasLog && d.mood);
    if (currentWeek.length > 0 && prevWeek.length > 0) {
      const avgCurrent = currentWeek.reduce((s, d) => s + d.mood, 0) / currentWeek.length;
      const avgPrev = prevWeek.reduce((s, d) => s + d.mood, 0) / prevWeek.length;
      if (avgCurrent >= avgPrev + 1.0) {
        alerts.push({
          ...RULE_CONSTANTS.MT2,
          isWarning: false
        });
      }
    }
  }

  // B. SLEEP ANALYTICS (SL)
  // Rule SL1: Severe Sleep Crunch (avg sleep < 6.0h for >= 3 consecutive days)
  let sleepCrunchStreak = 0;
  let maxSleepCrunchStreak = 0;
  continuousDaysData.forEach(d => {
    if (d.hasLog && d.sleepHours > 0 && d.sleepHours < 6.0) {
      sleepCrunchStreak++;
      if (sleepCrunchStreak > maxSleepCrunchStreak) maxSleepCrunchStreak = sleepCrunchStreak;
    } else {
      sleepCrunchStreak = 0;
    }
  });
  if (maxSleepCrunchStreak >= 3) {
    alerts.push({
      ...RULE_CONSTANTS.SL1,
      isWarning: true
    });
  }

  // Rule SL2: Sleep Schedule Shift / Circadian Instability (bedtime drift > 3.0h)
  const bedtimes = rolling7.filter(d => d.sleepStartDecimal !== null).map(d => d.sleepStartDecimal);
  if (bedtimes.length >= 2) {
    const minBed = Math.min(...bedtimes);
    const maxBed = Math.max(...bedtimes);
    if (maxBed - minBed > 3.0) {
      alerts.push({
        ...RULE_CONSTANTS.SL2,
        isWarning: true
      });
    }
  }

  // Rule SL3: Sleep Improves Mood
  const highSleepMoods = loggedDays.filter(d => d.sleepHours >= 7.0 && d.mood !== null).map(d => d.mood);
  const lowSleepMoods = loggedDays.filter(d => d.sleepHours > 0 && d.sleepHours < 7.0 && d.mood !== null).map(d => d.mood);
  if (highSleepMoods.length >= 2 && lowSleepMoods.length >= 2) {
    const avgHigh = highSleepMoods.reduce((a, b) => a + b, 0) / highSleepMoods.length;
    const avgLow = lowSleepMoods.reduce((a, b) => a + b, 0) / lowSleepMoods.length;
    if (avgHigh >= avgLow + 0.5) {
      alerts.push({
        ...RULE_CONSTANTS.SL3,
        isWarning: false
      });
    }
  }

  // Rule SL4: Oversleeping Detection (sleep > 10h for >= 5 consecutive days)
  let oversleepStreak = 0;
  continuousDaysData.forEach(d => {
    if (d.hasLog && d.sleepHours > 10.0) {
      oversleepStreak++;
    } else {
      oversleepStreak = 0;
    }
  });
  if (oversleepStreak >= 5) {
    alerts.push({
      ...RULE_CONSTANTS.SL4,
      isWarning: false
    });
  }

  // C. HYDRATION ANALYTICS (HY)
  // Rule HY1: Low Hydration Deficit (water < 1.5L for >= 3 consecutive days)
  let lowHydrationStreak = 0;
  rolling7.forEach(d => {
    if (d.waterLiters < 1.5) lowHydrationStreak++;
    else lowHydrationStreak = 0;
  });
  if (lowHydrationStreak >= 3) {
    alerts.push({
      ...RULE_CONSTANTS.HY1,
      isWarning: true
    });
  }

  // Rule HY2: Hydration Improves Mood
  const highWaterMoods = loggedDays.filter(d => d.waterLiters >= 2.0 && d.mood !== null).map(d => d.mood);
  const lowWaterMoods = loggedDays.filter(d => d.waterLiters < 1.5 && d.mood !== null).map(d => d.mood);
  if (highWaterMoods.length >= 2 && lowWaterMoods.length >= 2) {
    const avgHigh = highWaterMoods.reduce((a, b) => a + b, 0) / highWaterMoods.length;
    const avgLow = lowWaterMoods.reduce((a, b) => a + b, 0) / lowWaterMoods.length;
    if (avgHigh >= avgLow + 0.5) {
      alerts.push({
        ...RULE_CONSTANTS.HY2,
        isWarning: false
      });
    }
  }

  // D. EXERCISE ANALYTICS (EX)
  // Rule EX1: Sedentary Drop (< 2 exercise sessions in 7 days)
  const exerciseSessionsCount = rolling7.filter(d => d.exerciseMins > 0).length;
  if (exerciseSessionsCount < 2) {
    alerts.push({
      ...RULE_CONSTANTS.EX1,
      isWarning: true
    });
  }

  // Rule EX2: Exercise Improves Mood
  const activeMoods = loggedDays.filter(d => d.exerciseMins > 0 && d.mood !== null).map(d => d.mood);
  const restMoods = loggedDays.filter(d => d.exerciseMins === 0 && d.mood !== null).map(d => d.mood);
  if (activeMoods.length >= 2 && restMoods.length >= 2) {
    const avgActive = activeMoods.reduce((a, b) => a + b, 0) / activeMoods.length;
    const avgRest = restMoods.reduce((a, b) => a + b, 0) / restMoods.length;
    if (avgActive >= avgRest + 0.5) {
      alerts.push({
        ...RULE_CONSTANTS.EX2,
        isWarning: false
      });
    }
  }

  // Rule EX3: Sudden Exercise Reduction
  if (continuousDaysData.length >= 14) {
    const currentWeekEx = continuousDaysData.slice(-7).reduce((s, d) => s + d.exerciseMins, 0);
    const prevWeekEx = continuousDaysData.slice(-14, -7).reduce((s, d) => s + d.exerciseMins, 0);
    if (prevWeekEx >= 60 && currentWeekEx <= prevWeekEx * 0.5) {
      alerts.push({
        ...RULE_CONSTANTS.EX3,
        isWarning: false
      });
    }
  }

  // E. STUDY & COGNITIVE WORKLOAD ANALYTICS (ST)
  // Rule ST1: Excessive Study / Burnout Risk
  let highStudyStreak = 0;
  rolling7.forEach(d => {
    if (d.studyMins > 600) highStudyStreak++; // > 10 hours/day
    else highStudyStreak = 0;
  });
  const avgStudy = rolling7.reduce((s, d) => s + d.studyMins, 0) / 7;
  const avgEx = rolling7.reduce((s, d) => s + d.exerciseMins, 0) / 7;
  if (highStudyStreak >= 3 || (avgStudy > 90 && avgEx < 15)) {
    alerts.push({
      ...RULE_CONSTANTS.ST1,
      isWarning: true
    });
  }

  // Rule ST2: Study Correlates With Mood Decline
  const highStudyMoods = loggedDays.filter(d => d.studyMins > 90 && d.mood !== null).map(d => d.mood);
  const lowStudyMoods = loggedDays.filter(d => d.studyMins <= 30 && d.mood !== null).map(d => d.mood);
  if (highStudyMoods.length >= 2 && lowStudyMoods.length >= 2) {
    const avgHigh = highStudyMoods.reduce((a, b) => a + b, 0) / highStudyMoods.length;
    const avgLow = lowStudyMoods.reduce((a, b) => a + b, 0) / lowStudyMoods.length;
    if (avgHigh <= avgLow - 0.5) {
      alerts.push({
        ...RULE_CONSTANTS.ST2,
        isWarning: false
      });
    }
  }

  // F. WELLNESS COMBINATION RULES (WL)
  // Rule WL1: Behavioral Instability (mood <= 2 & sleep < 6h & exercise == 0 for >= 3 consecutive days)
  let wl1Streak = 0;
  continuousDaysData.forEach(d => {
    if (d.hasLog && d.mood !== null && d.mood <= 2 && d.sleepHours < 6.0 && d.exerciseMins === 0) {
      wl1Streak++;
    } else {
      wl1Streak = 0;
    }
  });
  if (wl1Streak >= 3) {
    alerts.push({
      ...RULE_CONSTANTS.WL1,
      isWarning: true
    });
  }

  // Rule WL2: Positive Wellness Pattern
  const { avgSleep, avgWater, activeExerciseSessions, mc } = calculateWellnessScore(continuousDaysData);
  if (avgSleep >= 7.0 && avgWater >= 2.0 && activeExerciseSessions >= 3 && mc >= 0.7) {
    alerts.push({
      ...RULE_CONSTANTS.WL2,
      isWarning: false
    });
  }

  return alerts;
};

// ============================================================================
// 5. DASHBOARD INTERPRETERS GENERATOR
// ============================================================================

/**
 * Generates plain-language interpreter summaries for Dashboard views.
 */
export const generateDashboardInterpreters = (continuousDaysData = [], moodMetaConfig = {}) => {
  const rolling7 = continuousDaysData.slice(-7);
  const loggedDays = rolling7.filter(d => d.hasLog);

  // Recent Lifestyle Takeaway
  let lifestyleSummary = { sentence: '', severityClass: 'positive-state' };
  if (loggedDays.length > 0) {
    const latest = loggedDays[loggedDays.length - 1];
    const moodName = moodMetaConfig[latest.mood]?.name || 'Logged State';
    if (latest.mood >= 4) {
      lifestyleSummary = {
        sentence: `Takeaway Summary: You slept a healthy ${latest.sleepHours} hours and recorded ${latest.waterGlasses} glasses of water, correlating with your positive "${moodName}" state.`,
        severityClass: 'positive-state'
      };
    } else if (latest.sleepHours < 6 || latest.waterGlasses < 5) {
      lifestyleSummary = {
        sentence: `Takeaway Summary: Your shortened rest cycle (${latest.sleepHours} hrs) or fluid intake (${latest.waterGlasses} glasses) co-occurred with an emotional low point ("${moodName}"). Increasing rest tomorrow should support recovery.`,
        severityClass: 'medium-severity'
      };
    } else {
      lifestyleSummary = {
        sentence: `Takeaway Summary: You logged ${latest.sleepHours} hours of sleep and ${latest.waterGlasses} glasses of water. Your mood registered as "${moodName}". Take things easy today and review your self-care routines.`,
        severityClass: 'positive-state'
      };
    }
  }

  return {
    lifestyleSummary
  };
};
