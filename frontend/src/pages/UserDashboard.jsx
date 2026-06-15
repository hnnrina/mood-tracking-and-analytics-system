// src/pages/UserDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import MindTrackLogo from '../components/MindTrackLogo';
import { MoodVectors, NavIcons, DashboardIcons } from '../components/MoodVectors';
import './UserDashboard.css';

// Import Recharts charting engines for data visualization
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ReferenceLine, ReferenceArea
} from 'recharts';

// ========================================================
// GLOBAL SCOPE CONFIGURATIONS & UTILITIES (Hoisting Protected)
// ========================================================
const moodMetaConfig = {
  1: { name: 'Very Sad', class: 'bg-lvl-1', color: '#e53e3e' },
  2: { name: 'Sad', class: 'bg-lvl-2', color: '#dd6b20' },
  3: { name: 'Neutral', class: 'bg-lvl-3', color: '#4a5568' },
  4: { name: 'Happy', class: 'bg-lvl-4', color: '#38a169' },
  5: { name: 'Very Happy', class: 'bg-lvl-5', color: '#81b29a' },
};

const circleRadius = 55;
const circleCircumference = 2 * Math.PI * circleRadius;

const formatDecimalBedtimeToHuman = (decimalHours) => {
  if (!decimalHours) return '';
  let hours = Math.floor(decimalHours);
  let minutes = Math.round((decimalHours - hours) * 60);
  let isNextDay = false;
  if (hours >= 24) {
    hours -= 24;
    isNextDay = true;
  }
  const ampm = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}${isNextDay ? ' (Next Day)' : ''}`;
};

// --- RECHARTS GLOBAL CUSTOM TOOLTIP LAYOUTS ---
const CustomCorrelationTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip-box">
        <p className="tooltip-date-header">{data.dateStr}</p>
        <p className="tooltip-data-row" style={{ color: '#81b29a' }}>
          Mood: {moodMetaConfig[data['Mood Index']]?.name || 'Unknown'} ({data['Mood Index']}/5)
        </p>
        <p className="tooltip-data-row" style={{ color: '#778da9' }}>
          Sleep Duration: {data['Sleep Duration (hrs)']} hrs
        </p>
        <p className="tooltip-data-row" style={{ color: '#629098' }}>
          Hydration: {data['Hydration (Glasses)']} Glasses
        </p>
      </div>
    );
  }
  return null;
};

const CustomCircadianTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip-box">
        <p className="tooltip-date-header">{data.dateStr}</p>
        <p className="tooltip-data-row" style={{ color: '#b78773' }}>
          Bedtime Target: {formatDecimalBedtimeToHuman(data['Bedtime Hour Index'])}
        </p>
      </div>
    );
  }
  return null;
};

// ========================================================
// MAIN DASHBOARD COMPONENT WORKSPACE
// ========================================================
const UserDashboard = () => {
  const { user } = useAuth();
  
  // Navigation layout states
  const [currentView, setCurrentView] = useState('calendar'); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Analytics snapshot constraint variables
  const [analyticsDaysRange, setAnalyticsDaysRange] = useState(7);

  // Collapsible layperson guide flags
  const [showHelpA, setShowHelpA] = useState(false);
  const [showHelpB, setShowHelpB] = useState(false);
  const [showHelpC, setShowHelpC] = useState(false);

  // LIVE DATA REGISTERS
  const [notifications, setNotifications] = useState([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Profile metadata hooks
  const [profileName, setProfileName] = useState('Wellness Member');
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  // Database data packets caches
  const [monthlyLogs, setMonthlyLogs] = useState({});
  const [allLogsChronological, setAllLogsChronological] = useState([]); 
  const [selectedDayLog, setSelectedDayLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search filter tools
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');

  // --- LOGGING INPUT FORM HANDLERS ---
  const [selectedMood, setSelectedMood] = useState(null);
  const [journalNotes, setJournalNotes] = useState('');
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [logTargetDate, setLogTargetDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modification state engines
  const [isEditMode, setIsEditMode] = useState(false);
  const [editEntryId, setEditEntryId] = useState(null);

  // Dynamic input habit variables
  const [trackSleep, setTrackSleep] = useState(false);
  const [trackWater, setTrackWater] = useState(false);
  const [trackExercise, setTrackExercise] = useState(false);
  const [trackStudy, setTrackStudy] = useState(false);

  // Discrete form constraints bounds
  const [sleepStart, setSleepStart] = useState('');
  const [sleepEnd, setSleepEnd] = useState('');
  const [waterGlasses, setWaterGlasses] = useState('');
  const [exerciseType, setExerciseType] = useState('Running');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [studyStart, setStudyStart] = useState('');
  const [studyEnd, setStudyEnd] = useState('');

  // Calendar parameters calculations bounds
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const weekOffsetIndex = new Date(year, month, 1).getDay();

  const dayGridCells = [];
  for (let i = 0; i < weekOffsetIndex; i++) dayGridCells.push({ type: 'empty' });
  for (let d = 1; d <= totalDays; d++) dayGridCells.push({ type: 'day', num: d });

  const fetchUserProfileDetails = async () => {
    if (!user?.id) return;
    try {
      const { data, error = null } = await supabase.from('profile').select('full_name, avatar_url').eq('id', user.id).single();
      if (error) throw error;
      if (data?.full_name) setProfileName(data.full_name);
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    } catch (err) {
      console.error('Error syncing layout credentials:', err.message);
    }
  };

  const fetchUserNotificationsSystem = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, access_requests!request_id(*)') 
        .eq('profile_id', user.id)
        .eq('is_read', false) // Only fetch unread alerts/requests to maintain system clarity
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching live system notifications ledger:', err.message);
    }
  };

  const fetchDashboardDataSystem = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: allEntries, error: allErr } = await supabase
        .from('mood_entry')
        .select('id, mood_id, notes, created_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      if (allErr) throw allErr;

      const firstISO = new Date(year, month, 1).toISOString();
      const lastISO = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data: monthEntries, error: monthErr } = await supabase
        .from('mood_entry')
        .select('id, mood_id, notes, created_at')
        .eq('profile_id', user.id)
        .gte('created_at', firstISO)
        .lte('created_at', lastISO);

      if (monthErr) throw monthErr;

      const hydrateDataPayload = async (sourceEntries) => {
        const results = [];
        for (const entry of sourceEntries) {
          const { data: activities } = await supabase
            .from('activity_log')
            .select(`
              id, activity_type,
              sleep_activity(duration_hours, start_time, end_time),
              water_activity(liters_consumed, glasses_count),
              exercise_activity(duration_minutes, exercise_type),
              study_activity(duration_minutes, start_time, end_time)
            `)
            .eq('mood_entry_id', entry.id);

          const subMetricsBundle = { sleep: null, water: null, exercise: null, study: null };
          
          activities?.forEach(act => {
            const sleepData = Array.isArray(act.sleep_activity) ? act.sleep_activity[0] : act.sleep_activity;
            const waterData = Array.isArray(act.water_activity) ? act.water_activity[0] : act.water_activity;
            const exerciseData = Array.isArray(act.exercise_activity) ? act.exercise_activity[0] : act.exercise_activity;
            const studyData = Array.isArray(act.study_activity) ? act.study_activity[0] : act.study_activity;

            if (act.activity_type === 'Sleep' && sleepData) subMetricsBundle.sleep = { logId: act.id, ...sleepData };
            if (act.activity_type === 'Water' && waterData) subMetricsBundle.water = { logId: act.id, ...waterData };
            if (act.activity_type === 'Exercise' && exerciseData) subMetricsBundle.exercise = { logId: act.id, ...exerciseData };
            if (act.activity_type === 'Study' && studyData) subMetricsBundle.study = { logId: act.id, ...studyData };
          });

          results.push({ ...entry, subActivities: subMetricsBundle });
        }
        return results;
      };

      const consolidatedHistoryArray = await hydrateDataPayload(allEntries);
      const consolidatedCalendarArray = await hydrateDataPayload(monthEntries);

      setAllLogsChronological(consolidatedHistoryArray);
      
      const calendarMap = {};
      consolidatedCalendarArray.forEach(item => {
        const dayNum = new Date(item.created_at).getDate();
        calendarMap[dayNum] = item;
      });
      setMonthlyLogs(calendarMap);

    } catch (err) {
      console.error('Data loading error sequence dropped:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfileDetails();
      fetchDashboardDataSystem();
      fetchUserNotificationsSystem();
    }
  }, [user, currentDate]);

  // FIXED FORM ENGINE FUNCTION WRAPPER
  const triggerNewEntryView = (targetDateStr = new Date().toISOString().split('T')[0]) => {
    setIsEditMode(false);
    setEditEntryId(null);
    setSelectedMood(null);
    setJournalNotes('');
    setTrackSleep(false); setTrackWater(false); setTrackExercise(false); setTrackStudy(false);
    setSleepStart(''); setSleepEnd(''); setWaterGlasses(''); setExerciseDuration(''); setStudyStart(''); setStudyEnd('');
    setLogTargetDate(targetDateStr);
    setCurrentView('new-entry');
  };

  const runEditLoadingSequence = (logPayload) => {
    setIsModalOpen(false); 
    setIsEditMode(true);
    setEditEntryId(logPayload.id);
    
    const entryDateObj = new Date(logPayload.created_at);
    setLogTargetDate(entryDateObj.toISOString().split('T')[0]);
    
    setSelectedMood(logPayload.mood_id);
    setJournalNotes(logPayload.notes || '');

    const acts = logPayload.subActivities;
    setTrackSleep(!!acts.sleep);
    if (acts.sleep) { setSleepStart(acts.sleep.start_time || ''); setSleepEnd(acts.sleep.end_time || ''); }

    setTrackWater(!!acts.water);
    if (acts.water) { setWaterGlasses(acts.water.glasses_count || ''); }

    setTrackExercise(!!acts.exercise);
    if (acts.exercise) { setExerciseType(acts.exercise.exercise_type || 'Running'); setExerciseDuration(acts.exercise.duration_minutes || ''); }

    setTrackStudy(!!acts.study);
    if (acts.study) { setStudyStart(acts.study.start_time || ''); setStudyEnd(acts.study.end_time || ''); }

    setCurrentView('new-entry');
  };

  const handleDeleteEntry = async (entryId) => {
    const doubleCheck = window.confirm("Are you sure you want to permanently delete this mood log entry? All corresponding tracking metric row items will be wiped.");
    if (!doubleCheck) return;

    try {
      const { error } = await supabase.from('mood_entry').delete().eq('id', entryId);
      if (error) throw error;
      alert('Entry cleared safely from your system records.');
      setIsModalOpen(false);
      fetchDashboardDataSystem(); 
    } catch (err) {
      alert('Failed to drop elements: ' + err.message);
    }
  };

  const handleAvatarPhotoUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const storagePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(storagePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: pathResolver } = supabase.storage.from('avatars').getPublicUrl(storagePath);
      const publicUrl = pathResolver.publicUrl;
      await supabase.from('profile').update({ avatar_url: publicUrl }).eq('id', user.id);
      setAvatarUrl(publicUrl);
      alert('Profile photo asset uploaded securely.');
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  // OPTIMISTIC TRANSACTION HANDSHAKE: Instantly filters out the target card to hide it on click
  const handleResolveConsentTransaction = async (notificationId, requestId, statusInput) => {
    setIsProcessingAction(true);
    const booleanAgreementValue = statusInput === 'approved';
    
    // UI POP DROP: Optimistically filter the targeted index out before async callbacks resolve
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    try {
      const { error: requestErr } = await supabase
        .from('access_requests')
        .update({ 
          user_agreed: booleanAgreementValue,
          status: booleanAgreementValue ? 'active' : 'rejected'
        })
        .eq('id', requestId);
      if (requestErr) throw requestErr;

      const { error: notificationErr } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (notificationErr) throw notificationErr;

      alert(`Consent submitted successfully. Monitoring channel set to: ${statusInput.toUpperCase()}`);
    } catch (err) {
      alert('Database update transaction dropped: ' + err.message);
      fetchUserNotificationsSystem(); // Re-sync local storage ledger state on fallback crash
    } finally {
      setIsProcessingAction(false);
    }
  };

  // GENERAL DISMISSER PROCESSOR: Flags data row updates to clear notifications cleanly
  const handleMarkNotificationAsRead = async (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    } catch (err) {
      alert('Failed to hide alert: ' + err.message);
      fetchUserNotificationsSystem();
    }
  };

  const handleEntryFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMood) {
      alert('Please choose your mood.');
      return;
    }
    setIsFormSubmitting(true);

    try {
      const targetedTimestampISO = new Date(`${logTargetDate}T12:00:00`).toISOString();
      let moodEntryId = editEntryId;

      if (isEditMode) {
        const { error: moodUpdateErr } = await supabase
          .from('mood_entry')
          .update({ mood_id: selectedMood, notes: journalNotes, created_at: targetedTimestampISO })
          .eq('id', editEntryId);
        if (moodUpdateErr) throw moodUpdateErr;
      } else {
        const { data: newMoodRow, error: moodInsertErr } = await supabase
          .from('mood_entry')
          .insert([{ profile_id: user.id, mood_id: selectedMood, notes: journalNotes, created_at: targetedTimestampISO }])
          .select().single();
        if (moodInsertErr) throw moodInsertErr;
        moodEntryId = newMoodRow.id;
      }

      const handleSubTableSync = async (isEnabled, type, tableName, fieldsObject, existingActConfig) => {
        if (isEditMode && existingActConfig) {
          if (!isEnabled) {
            await supabase.from('activity_log').delete().eq('id', existingActConfig.logId);
          } else {
            await supabase.from(tableName).update(fieldsObject).eq('activity_id', existingActConfig.logId);
          }
        } else if (isEnabled) {
          const { data: logRow } = await supabase.from('activity_log').insert([{ mood_entry_id: moodEntryId, activity_type: type }]).select().single();
          await supabase.from(tableName).insert([{ activity_id: logRow.id, ...fieldsObject }]);
        }
      };

      const existingActs = isEditMode ? selectedDayLog?.subActivities || allLogsChronological.find(l => l.id === editEntryId)?.subActivities : {};

      const sleepHours = computeTimeDelta(sleepStart, sleepEnd, 'hours');
      await handleSubTableSync(trackSleep, 'Sleep', 'sleep_activity', { start_time: sleepStart, end_time: sleepEnd, duration_hours: sleepHours }, existingActs?.sleep);

      const waterLiters = parseFloat((waterGlasses * 0.25).toFixed(2));
      await handleSubTableSync(trackWater, 'Water', 'water_activity', { glasses_count: parseInt(waterGlasses), liters_consumed: waterLiters }, existingActs?.water);

      await handleSubTableSync(trackExercise, 'Exercise', 'exercise_activity', { exercise_type: exerciseType, duration_minutes: parseInt(exerciseDuration) }, existingActs?.exercise);

      const studyMins = computeTimeDelta(studyStart, studyEnd, 'minutes');
      await handleSubTableSync(trackStudy, 'Study', 'study_activity', { start_time: studyStart, end_time: studyEnd, duration_minutes: studyMins }, existingActs?.study);

      const { data: recentHistoricalLogs } = await supabase
        .from('mood_entry')
        .select(`
          id, mood_id, created_at,
          activity_log (
            activity_type,
            sleep_activity(duration_hours),
            water_activity(glasses_count),
            exercise_activity(duration_minutes)
          )
        `)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);

      if (recentHistoricalLogs && recentHistoricalLogs.length > 0) {
        let cumulativeMoodScore = 0, cumulativeSleepScore = 0, cumulativeExerciseScore = 0, cumulativeWaterScore = 0;
        let sleepDays = 0, waterDays = 0, totalExerciseMins = 0;

        recentHistoricalLogs.forEach(log => {
          cumulativeMoodScore += (log.mood_id / 5);
          const actsList = log.activity_log || [];
          actsList.forEach(act => {
            if (act.activity_type === 'Sleep' && act.sleep_activity?.[0]) {
              sleepDays++;
              cumulativeSleepScore += Math.min(parseFloat(act.sleep_activity[0].duration_hours) / 8, 1);
            }
            if (act.activity_type === 'Water' && act.water_activity?.[0]) {
              waterDays++;
              cumulativeWaterScore += Math.min(parseInt(act.water_activity[0].glasses_count) / 8, 1);
            }
            if (act.activity_type === 'Exercise' && act.exercise_activity?.[0]) {
              totalExerciseMins += parseInt(act.exercise_activity[0].duration_minutes);
              cumulativeExerciseScore += Math.min(parseInt(act.exercise_activity[0].duration_minutes) / 30, 1);
            }
          });
        });

        const N = recentHistoricalLogs.length;
        const mCoeff = cumulativeMoodScore / N;
        const sCoeff = sleepDays > 0 ? (cumulativeSleepScore / sleepDays) : 0.5;
        const wCoeff = waterDays > 0 ? (cumulativeWaterScore / waterDays) : 0.5;
        const eCoeff = totalExerciseMins > 0 ? Math.min(totalExerciseMins / 150, 1) : 0;
        const finalWellnessScore = Math.round((mCoeff * 0.4 + sCoeff * 0.3 + eCoeff * 0.2 + wCoeff * 0.1) * 100);

        if (isEditMode) {
          await supabase.from('wellness_analysis').delete().eq('mood_entry_id', moodEntryId);
        }

        const { data: analysisSnapshot, error: analysisErr = null } = await supabase
          .from('wellness_analysis')
          .insert([{
            profile_id: user.id,
            mood_entry_id: moodEntryId,
            wellness_score: finalWellnessScore,
            mood_consistency: parseFloat(mCoeff.toFixed(3)),
            sleep_consistency: parseFloat(sCoeff.toFixed(3)),
            hydration_consistency: parseFloat(wCoeff.toFixed(3)),
            exercise_consistency: parseFloat(eCoeff.toFixed(3))
          }])
          .select().single();

        if (!analysisErr && analysisSnapshot) {
          const bulkRecommendationRows = [];
          if (recentHistoricalLogs.slice(0, 3).every(l => l.mood_id <= 2) && recentHistoricalLogs.length >= 3) {
            bulkRecommendationRows.push({
              analysis_id: analysisSnapshot.id, rule_id: 'MT1', alert_severity: 'High',
              message_content: "Low Mood Streak: Emotional stability indicators have been downcast for 3 consecutive days. Review notes data structures with an assigned practitioner."
            });
          }
          if (recentHistoricalLogs.length >= 2 && (recentHistoricalLogs[0].mood_id <= recentHistoricalLogs[1].mood_id - 2)) {
            const lastMoodName = moodMetaConfig[recentHistoricalLogs[1].mood_id]?.name || 'Unknown';
            const currMoodName = moodMetaConfig[recentHistoricalLogs[0].mood_id]?.name || 'Unknown';
            bulkRecommendationRows.push({
              analysis_id: analysisSnapshot.id, rule_id: 'MT3', alert_severity: 'High',
              message_content: `Sudden Mood Drop: Your metrics dropped sharply by 2 levels from ${lastMoodName} to ${currMoodName}. Take some time for self-care.`
            });
          }
          const sleepHoursList = recentHistoricalLogs.slice(0, 5).map(l => {
            const match = l.activity_log?.find(a => a.activity_type === 'Sleep');
            return match?.sleep_activity?.[0] ? parseFloat(match.sleep_activity[0].duration_hours) : 8;
          });
          if (sleepHoursList.length >= 5 && sleepHoursList.every(h => h < 5)) {
            bulkRecommendationRows.push({
              analysis_id: analysisSnapshot.id, rule_id: 'SL1', alert_severity: 'Medium',
              message_content: "Critical Sleep Deficit: Sleep metrics have fallen below 5 hours for 5 consecutive entries. Prioritize standard rest intervals."
            });
          }

          if (bulkRecommendationRows.length > 0) {
            await supabase.from('system_recommendation').insert(bulkRecommendationRows);
          }
        }
      }

      alert(isEditMode ? 'Log entry updated successfully!' : 'Daily parameters logged and processed successfully!');
      triggerNewEntryView();
      fetchDashboardDataSystem();
      fetchUserNotificationsSystem();
      setCurrentView('calendar');
    } catch (err) {
      alert('Transaction error caught: ' + err.message);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Statistics loops parsing arrays
  const rollingWeekLogs = allLogsChronological.slice(0, 7);
  let avgSleep = 0, avgWater = 0, totalExercise = 0, totalStudy = 0;
  let sleepLoggedDays = 0, waterLoggedDays = 0, computedWellnessScore = 0;
  const triggeredAdviceAlerts = [];

  if (rollingWeekLogs.length > 0) {
    let cumulativeMoodScore = 0, cumulativeSleepScore = 0, cumulativeExerciseScore = 0, cumulativeWaterScore = 0;
    rollingWeekLogs.forEach(log => {
      cumulativeMoodScore += (log.mood_id / 5);
      if (log.subActivities?.sleep) {
        const hours = parseFloat(log.subActivities.sleep.duration_hours || 0);
        avgSleep += hours; sleepLoggedDays++;
        cumulativeSleepScore += Math.min(hours / 8, 1);
      }
      if (log.subActivities?.water) {
        const glasses = parseInt(log.subActivities.water.glasses_count || 0);
        avgWater += glasses; waterLoggedDays++;
        cumulativeWaterScore += Math.min(glasses / 8, 1);
      }
      if (log.subActivities?.exercise) {
        const mins = parseInt(log.subActivities.exercise.duration_minutes || 0);
        totalExercise += mins;
        cumulativeExerciseScore += Math.min(mins / 30, 1);
      }
      if (log.subActivities?.study) {
        totalStudy += parseInt(log.subActivities.study.duration_minutes || 0);
      }
    });

    const N = rollingWeekLogs.length;
    avgSleep = sleepLoggedDays > 0 ? parseFloat((avgSleep / sleepLoggedDays).toFixed(1)) : 0;
    avgWater = waterLoggedDays > 0 ? parseFloat((avgWater / waterLoggedDays).toFixed(1)) : 0;

    const finalMoodCoeff = cumulativeMoodScore / N;
    const finalSleepCoeff = sleepLoggedDays > 0 ? (cumulativeSleepScore / sleepLoggedDays) : 0.5;
    const finalExerciseCoeff = totalExercise > 0 ? Math.min(totalExercise / 150, 1) : 0; 
    const finalWaterCoeff = waterLoggedDays > 0 ? (cumulativeWaterScore / waterLoggedDays) : 0.5;

    computedWellnessScore = Math.round((finalMoodCoeff * 0.4 + finalSleepCoeff * 0.3 + finalExerciseCoeff * 0.2 + finalWaterCoeff * 0.1) * 100);

    if (allLogsChronological.slice(0, 3).every(l => l.mood_id <= 2) && allLogsChronological.length >= 3) {
      triggeredAdviceAlerts.push({ severity: 'high', message: "Low Mood Streak: Emotional stability indicators have been downcast for 3 consecutive entries. Review notes data structures with an assigned practitioner." });
    }
    if (allLogsChronological.length >= 2) {
      const pastMoodName = moodMetaConfig[allLogsChronological[1]?.mood_id]?.name || 'Unknown';
      const presentMoodName = moodMetaConfig[allLogsChronological[0]?.mood_id]?.name || 'Unknown';
      if (allLogsChronological[0]?.mood_id <= allLogsChronological[1]?.mood_id - 2) {
        triggeredAdviceAlerts.push({ severity: 'high', message: `Sudden Mood Drop: Your metric index shifted down from ${pastMoodName} to ${presentMoodName}. Take some time for self-care.` });
      }
    }
  }

  const filteredHistoryLogs = allLogsChronological.filter(item => {
    const textTargetString = (item.notes || '').toLowerCase();
    const moodNameString = moodMetaConfig[item.mood_id]?.name.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return (textTargetString.includes(query) || moodNameString.includes(query)) && (moodFilter === 'all' || item.mood_id === parseInt(moodFilter));
  });

  const targetAnalyticsLogs = allLogsChronological.slice(0, analyticsDaysRange).reverse();

  const correlationChartData = targetAnalyticsLogs.map(log => {
    const dObj = new Date(log.created_at);
    return {
      dateStr: dObj.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
      'Mood Index': log.mood_id,
      'Sleep Duration (hrs)': log.subActivities?.sleep ? parseFloat(log.subActivities.sleep.duration_hours) : 0,
      'Hydration (Glasses)': log.subActivities?.water ? parseInt(log.subActivities.water.glasses_count) : 0
    };
  });

  const emotionalDistributionCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  targetAnalyticsLogs.forEach(log => {
    if (emotionalDistributionCounts[log.mood_id] !== undefined) {
      emotionalDistributionCounts[log.mood_id]++;
    }
  });

  const pieChartDataData = Object.keys(emotionalDistributionCounts).map(idKey => ({
    name: moodMetaConfig[idKey].name,
    value: emotionalDistributionCounts[idKey],
    color: moodMetaConfig[idKey].color
  })).filter(slice => slice.value > 0);

  const bedtimeTimelineData = targetAnalyticsLogs.map(log => {
    const dObj = new Date(log.created_at);
    let decimalBedtimeHours = 0;
    if (log.subActivities?.sleep?.start_time) {
      const [h, m] = log.subActivities.sleep.start_time.split(':').map(Number);
      decimalBedtimeHours = h + (m / 60);
      if (h < 6) decimalBedtimeHours += 24; 
    }
    return {
      dateStr: dObj.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
      'Bedtime Hour Index': parseFloat(decimalBedtimeHours.toFixed(2)),
      rawTimeStr: log.subActivities?.sleep?.start_time || 'No log'
    };
  }).filter(item => item['Bedtime Hour Index'] > 0);

  const longitudinalInsightRecommendations = [];

  if (targetAnalyticsLogs.length >= 3) {
    const validBedtimes = bedtimeTimelineData.map(d => d['Bedtime Hour Index']);
    if (validBedtimes.length >= 3) {
      const minSleepOnset = Math.min(...validBedtimes);
      const maxSleepOnset = Math.max(...validBedtimes);
      if (maxSleepOnset - minSleepOnset > 3) {
        longitudinalInsightRecommendations.push({
          isWarning: true,
          message: "Circadian Rhythm Instability Detected (Rule SL2): Your sleep onset boundary has drifted by more than 3 hours across this window. Erratic bedtimes penalize overall emotional recovery vectors."
        });
      }
    }
  }

  const activeUnreadNotificationsCount = notifications.filter(n => !n.is_read).length;
  const arcStrokeOffset = circleCircumference - (computedWellnessScore / 100) * circleCircumference;

  if (!user?.id) {
    return <div className="dashboard-layout"><p style={{ margin: 'auto', color: '#8d99ae' }}>Initializing authorized encryption keys...</p></div>;
  }

  return (
    <div className="dashboard-layout">
      
      {/* SIDEBAR NAVIGATION CONTROL ELEMENT */}
      <aside className={`sidebar-nav ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand-box"><MindTrackLogo showText={!isSidebarCollapsed} /></div>
        <ul className="sidebar-menu-links">
          <li className={`sidebar-link-item ${currentView === 'calendar' ? 'active' : ''}`} onClick={() => setCurrentView('calendar')}>
            <NavIcons.Calendar />{!isSidebarCollapsed && <span>Wellness Calendar</span>}
          </li>
          <li className={`sidebar-link-item ${currentView === 'new-entry' ? 'active' : ''}`} onClick={() => triggerNewEntryView()}>
            <NavIcons.AddEntry />{!isSidebarCollapsed && <span>Log Entry</span>}
          </li>
          <li className={`sidebar-link-item ${currentView === 'history' ? 'active' : ''}`} onClick={() => setCurrentView('history')}>
            <NavIcons.History />{!isSidebarCollapsed && <span>Mood History</span>}
          </li>
          <li className={`sidebar-link-item ${currentView === 'analytics' ? 'active' : ''}`} onClick={() => setCurrentView('analytics')}>
            <NavIcons.Analytics />{!isSidebarCollapsed && <span>Trend Analytics</span>}
          </li>
          
          <li 
            className={`sidebar-link-item ${currentView === 'notifications' ? 'active' : ''}`} 
            onClick={() => setCurrentView('notifications')}
            style={{ position: 'relative' }}
          >
            <NavIcons.MenuToggle style={{ transform: 'rotate(90deg)' }} />
            {!isSidebarCollapsed && <span>Notification Center</span>}
            {activeUnreadNotificationsCount > 0 && (
              <span style={{ position: 'absolute', right: '16px', background: '#b78773', color: '#ffffff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {activeUnreadNotificationsCount}
              </span>
            )}
          </li>
        </ul>
      </aside>

      <div className="dashboard-main-content">
        
        {/* NAVBAR */}
        <nav className="top-navbar">
          <div className="nav-left-cluster">
            <button className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}><NavIcons.MenuToggle /></button>
            <span className="user-greeting">Welcome back, {profileName}</span>
          </div>

          <div className="profile-menu-container">
            <button className="avatar-interactive-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="User profile" className="avatar-image-render" />
              ) : (
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#6b9b84' }}>{profileName[0].toUpperCase()}</span>
              )}
            </button>
            {isDropdownOpen && (
              <div className="dropdown-floating-menu">
                <div className="dropdown-user-info">Logged as: <strong>{profileName}</strong></div>
                <label className="avatar-upload-label">📷 Upload Photo
                  <input type="file" accept="image/*" onChange={handleAvatarPhotoUpload} style={{ display: 'none' }} />
                </label>
                <button onClick={() => { setIsDropdownOpen(false); supabase.auth.signOut(); }} className="dropdown-action-item">🚪 Sign Out</button>
              </div>
            )}
          </div>
        </nav>

        {/* WORKSPACE VIEW SWITCHBOARD */}
        <main className="workspace-view">
          
          {/* VIEW BRANCH A: WELLNESS CALENDAR DASHBOARD */}
          {currentView === 'calendar' && (
            <>
              <div className="dashboard-hero-grid">
                <div className="wellness-gauge-card">
                  <span className="mini-stat-label" style={{ marginBottom: '10px' }}>Wellness Score</span>
                  <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                    <svg className="gauge-circle-svg" width="140" height="140">
                      <circle className="gauge-bg-track" cx="70" cy="70" r={circleRadius} />
                      <circle 
                        className="gauge-progress-bar" 
                        cx="70" cy="70" r={circleRadius} 
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={arcStrokeOffset}
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="gauge-percentage-text">{allLogsChronological.length > 0 ? `${computedWellnessScore}%` : '--'}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8d99ae', margin: '8px 0 0 0', lineHeight: 1.4 }}>Rolling 7-day snapshot calculation weight index</p>
                </div>

                <div className="alerts-center-card">
                  <h4 className="alerts-header-title"><DashboardIcons.Insights /> Automated Insights Engine</h4>
                  <div className="alerts-scroll-container">
                    {allLogsChronological.length === 0 ? (
                      <span className="alert-empty-state">Log a few parameter rows to activate active analytics tracking rules.</span>
                    ) : triggeredAdviceAlerts.length === 0 ? (
                      <div className="alert-message-strip positive-state" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DashboardIcons.SuccessCheck /> Good job! Your tracked lifestyle habits and emotional stability indexes are stable.
                      </div>
                    ) : (
                      triggeredAdviceAlerts.map((alert, idx) => (
                        <div key={idx} className={`alert-message-strip ${alert.severity === 'medium' ? 'medium-severity' : ''}`}>
                          {alert.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="metrics-summary-row">
                <div className="mini-stat-panel" style={{ borderTop: '4px solid #778da9' }}>
                  <span className="mini-stat-label" style={{ display: 'flex', alignItems: 'center', color: '#778da9' }}>
                    <DashboardIcons.Sleep /> Avg Sleep
                  </span>
                  <span className="mini-stat-value">{avgSleep > 0 ? `${avgSleep} hrs` : 'No logs'}</span>
                </div>
                <div className="mini-stat-panel" style={{ borderTop: '4px solid #629098' }}>
                  <span className="mini-stat-label" style={{ display: 'flex', alignItems: 'center', color: '#629098' }}>
                    <DashboardIcons.Hydration /> Avg Hydration
                  </span>
                  <span className="mini-stat-value">{avgWater > 0 ? `${avgWater} Glasses` : 'No logs'}</span>
                </div>
                <div className="mini-stat-panel" style={{ borderTop: '4px solid #81b29a' }}>
                  <span className="mini-stat-label" style={{ display: 'flex', alignItems: 'center', color: '#81b29a' }}>
                    <DashboardIcons.Exercise /> Active Minutes
                  </span>
                  <span className="mini-stat-value">{totalExercise > 0 ? `${totalExercise} mins` : '0 mins'}</span>
                </div>
                <div className="mini-stat-panel" style={{ borderTop: '4px solid #b78773' }}>
                  <span className="mini-stat-label" style={{ display: 'flex', alignItems: 'center', color: '#b78773' }}>
                    <DashboardIcons.Focus /> Focus Time
                  </span>
                  <span className="mini-stat-value">{totalStudy > 0 ? `${parseFloat((totalStudy / 60).toFixed(1))} hrs` : '0 hrs'}</span>
                </div>
              </div>

              <div className="workspace-header">
                <h2>{currentDate.toLocaleString('default', { month: 'long' })} {year}</h2>
                <div className="calendar-nav-buttons">
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="cal-arrow-btn">◀ Previous</button>
                  <button onClick={() => setCurrentDate(new Date())} className="cal-arrow-btn">Today</button>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="cal-arrow-btn">Next ▶</button>
                  <button onClick={() => triggerNewEntryView()} className="action-button-compact">
                    + Log Entry
                  </button>
                </div>
              </div>

              <div className="calendar-card">
                <div className="calendar-days-header">
                  <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="calendar-grid-cells">
                  {dayGridCells.map((cell, idx) => {
                    if (cell.type === 'empty') return <div key={`empty-${idx}`} className="calendar-day-cell empty-spacer" />;
                    const log = monthlyLogs[cell.num];
                    const moodCfg = log ? moodMetaConfig[log.mood_id] : null;
                    const RenderVector = log ? MoodVectors[log.mood_id] : null;

                    return (
                      <div key={`day-${cell.num}`} className="calendar-day-cell" onClick={() => {
                        if (log) { setSelectedDayLog({ day: cell.num, ...log }); setIsModalOpen(true); }
                        else { handleEmptyCellRouting(cell.num); }
                      }}>
                        <span className="day-number-label">{cell.num}</span>
                        {RenderVector && (
                          <div className="mood-vector-wrapper">
                            <div className={`mood-svg-container ${moodCfg.class}`}><RenderVector color={moodCfg.color} /></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TREND ANALYTICS VIEW */}
          {currentView === 'analytics' && (
            <div>
              <div className="workspace-header">
                <div>
                  <h2 style={{ marginBottom: '4px' }}>Longitudinal Trend Analytics</h2>
                  <p style={{ color: '#8d99ae', margin: 0, fontSize: '14px' }}>Analyze deep behavioral trends, habit correlations, and circadian rhythms over time.</p>
                </div>
              </div>

              <div className="analytics-window-toolbar">
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#4a4e69' }}>Select Analytics Filter Bounds:</span>
                <div className="calendar-nav-buttons">
                  <button className="cal-arrow-btn" style={{ borderColor: analyticsDaysRange === 7 ? '#81b29a' : '#dcdde1', backgroundColor: analyticsDaysRange === 7 ? '#f2f7f5' : '#ffffff', color: analyticsDaysRange === 7 ? '#81b29a' : '#6c757d' }} onClick={() => setAnalyticsDaysRange(7)}>Trailing 7 Logs</button>
                  <button className="cal-arrow-btn" style={{ borderColor: analyticsDaysRange === 30 ? '#81b29a' : '#dcdde1', backgroundColor: analyticsDaysRange === 30 ? '#f2f7f5' : '#ffffff', color: analyticsDaysRange === 30 ? '#81b29a' : '#6c757d' }} onClick={() => setAnalyticsDaysRange(30)}>Trailing 30 Logs</button>
                </div>
              </div>

              <div className="analytics-charts-matrix-grid">
                <div className="analytics-chart-card">
                  <div className="analytics-chart-header-cluster">
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#4a4e69' }}>How Your Habits Connect with Your Well-being</h4>
                      <span style={{ display: 'block', fontSize: '11px', color: '#8d99ae', fontWeight: 500, fontStyle: 'italic', marginTop: '2px' }}>Relational Habit-to-Mood Cross Matrix</span>
                    </div>
                    <button className={`chart-info-trigger-btn ${showHelpA ? 'active-help' : ''}`} onClick={() => setShowHelpA(!showHelpA)}>
                      <DashboardIcons.Help /> {showHelpA ? 'Hide Guide' : 'Explain Chart'}
                    </button>
                  </div>

                  {showHelpA && (
                    <div className="chart-explanation-box">
                      <p><strong>Layperson Overview:</strong> This graph combines your daily values to see if your hydration volume or rest patterns correspond to higher emotional scores.</p>
                    </div>
                  )}

                  <div style={{ width: '100%', height: '260px', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={correlationChartData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" strokeOpacity={0.4} />
                        <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#9a8c98' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" domain={[1, 5]} tickCount={5} tick={{ fontSize: 11, fill: '#4a4e69' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#778da9' }} axisLine={false} tickLine={false} />
                        
                        <Tooltip content={<CustomCorrelationTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        
                        <ReferenceArea y1={7} y2={9} yAxisId="right" fill="#778da9" fillOpacity={0.05} />
                        
                        <Bar yAxisId="right" dataKey="Hydration (Glasses)" name="Water Intake" fill="#629098" opacity={0.25} barSize={20} radius={[4, 4, 0, 0]} />
                        <Line yAxisId="left" type="monotone" dataKey="Mood Index" name="Your Tracked Mood" stroke="#81b29a" strokeWidth={3} dot={{ r: 4, strokeWidth: 1, fill: '#ffffff' }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" dataKey="Sleep Duration (hrs)" name="Daily Rest Duration" stroke="#778da9" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="analytics-chart-card">
                  <div className="analytics-chart-header-cluster">
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#4a4e69' }}>Your General Emotional Density Breakdown</h4>
                      <span style={{ display: 'block', fontSize: '11px', color: '#8d99ae', fontWeight: 500, fontStyle: 'italic', marginTop: '2px' }}>Categorical Frequency Distribution Scale</span>
                    </div>
                    <button className={`chart-info-trigger-btn ${showHelpB ? 'active-help' : ''}`} onClick={() => setShowHelpB(!showHelpB)}>
                      <DashboardIcons.Help /> {showHelpB ? 'Hide Guide' : 'Explain Chart'}
                    </button>
                  </div>

                  {showHelpB && (
                    <div className="chart-explanation-box">
                      <p><strong>Layperson Overview:</strong> This breaks down your recorded moods as pure percentages of your total logs over this period.</p>
                    </div>
                  )}

                  <div style={{ width: '100%', height: '240px', minWidth: 0, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieChartDataData} cx="50%" cy="45%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                          {pieChartDataData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} logs recorded`]} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    {pieChartDataData.length === 0 && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8d99ae' }}>No elements parsed</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="analytics-charts-matrix-grid">
                <div className="analytics-chart-card">
                  <div className="analytics-chart-header-cluster">
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#4a4e69' }}>Your Bedtime Schedule Consistency</h4>
                      <span style={{ display: 'block', fontSize: '11px', color: '#8d99ae', fontWeight: 500, fontStyle: 'italic', marginTop: '2px' }}>Circadian Schedule Variance Timeline (Rule SL2 Evaluation)</span>
                    </div>
                    <button className={`chart-info-trigger-btn ${showHelpC ? 'active-help' : ''}`} onClick={() => setShowHelpC(!showHelpC)}>
                      <DashboardIcons.Help /> {showHelpC ? 'Hide Guide' : 'Explain Chart'}
                    </button>
                  </div>

                  {showHelpC && (
                    <div className="chart-explanation-box">
                      <p><strong>Layperson Overview:</strong> This chart maps your sleep onset times. Flat paths mean healthy, consistent sleep habits, while sharp zigzag spikes flag irregular schedules.</p>
                    </div>
                  )}

                  <div style={{ width: '100%', height: '220px', minWidth: 0 }}>
                    {bedtimeTimelineData.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#8d99ae', padding: '40px', textAlign: 'center' }}>No sleep parameters logs recorded inside this window.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bedtimeTimelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" strokeOpacity={0.4} />
                          <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#9a8c98' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[20, 29]} tickCount={10} tickFormatter={(v) => `${v >= 24 ? v - 24 : v}:00`} tick={{ fontSize: 11, fill: '#4a4e69' }} axisLine={false} tickLine={false} />
                          
                          <Tooltip content={<CustomCircadianTooltip />} />
                          <ReferenceLine y={23} stroke="#b78773" strokeDasharray="3 3" opacity={0.6} label={{ value: 'Ideal Target', fill: '#b78773', fontSize: 10, position: 'insideBottomLeft' }} />
                          
                          <Area type="monotone" dataKey="Bedtime Hour Index" stroke="#b78773" fill="#fdf8f6" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 1, fill: '#ffffff' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="analytics-recommendations-deck">
                  <h4 className="analytics-chart-title" style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DashboardIcons.Insights /> Longitudinal Insights Engine
                  </h4>
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {longitudinalInsightRecommendations.length === 0 ? (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#81b29a', fontSize: '13px', padding: '20px', gap: '10px' }}>
                        <DashboardIcons.SuccessCheck />
                        <span style={{ fontStyle: 'italic', fontWeight: 500 }}>All lifestyle parameters look healthy across this trailing window.</span>
                      </div>
                    ) : (
                      longitudinalInsightRecommendations.map((insight, idx) => (
                        <div 
                          key={idx} 
                          className={`alert-message-strip ${insight.isWarning ? 'medium-severity' : 'positive-state'}`}
                          style={{ margin: 0, textAlign: 'left', fontSize: '12.5px' }}
                        >
                          {insight.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MOOD HISTORY MODULE */}
          {currentView === 'history' && (
            <div>
              <div className="workspace-header">
                <div>
                  <h2>Mood History</h2>
                  <p style={{ color: '#8d99ae', margin: 0, fontSize: '14px' }}>Analyze, modify, or drop historical daily log entries chronologically.</p>
                </div>
                <button onClick={() => triggerNewEntryView()} className="action-button-compact">
                  + New Entry
                </button>
              </div>

              <div className="history-controls-bar">
                <input 
                  type="text" className="search-input-field" 
                  placeholder="Search keywords inside journal reflections notes..." 
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
                
                <select className="filter-select-dropdown" value={moodFilter} onChange={e => setMoodFilter(e.target.value)}>
                  <option value="all">All Moods</option>
                  <option value="5">😄 Very Happy</option>
                  <option value="4">🙂 Happy</option>
                  <option value="3">😐 Neutral</option>
                  <option value="2">🙁 Sad</option>
                  <option value="1">😢 Very Sad</option>
                </select>
              </div>

              <div className="history-list-wrapper">
                {filteredHistoryLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', background: '#ffffff', padding: '40px', borderRadius: '16px', border: '1px solid #e9ecef' }}>
                    <p style={{ color: '#8d99ae', margin: '0 0 16px 0' }}>No matching historical mood records found.</p>
                  </div>
                ) : (
                  filteredHistoryLogs.map((item) => {
                    const moodCfg = moodMetaConfig[item.mood_id];
                    const VectorGraphic = MoodVectors[item.mood_id];
                    const entryDate = new Date(item.created_at);
                    
                    return (
                      <div key={item.id} className="history-item-card">
                        <div className="history-card-left-section">
                          <div className="history-mood-icon-frame">
                            <div className={`mood-svg-container ${moodCfg.class}`} style={{ width: '100%', height: '100%' }}>
                              <VectorGraphic color={moodCfg.color} />
                            </div>
                          </div>
                          <div className="history-metadata-box">
                            <h4 className="history-date-header">
                              {entryDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                              <span style={{ fontSize: '12px', fontWeight: '600', color: moodCfg.color, marginLeft: '10px', verticalAlign: 'middle' }}>
                                ({moodCfg.name})
                              </span>
                            </h4>
                            <p className="history-notes-preview">
                              {item.notes ? `"${item.notes}"` : "No reflection summary text annotation written."}
                            </p>
                            
                            <div className="history-activity-pills-row">
                              {item.subActivities?.sleep && <span className="history-pill-tag sleep">🛌 Sleep: {item.subActivities.sleep.duration_hours}h</span>}
                              {item.subActivities?.water && <span className="history-pill-tag water">💧 Water: {item.subActivities.water.glasses_count} Glasses</span>}
                              {item.subActivities?.exercise && <span className="history-pill-tag exercise">🏃 {item.subActivities.exercise.exercise_type} ({item.subActivities.exercise.duration_minutes}m)</span>}
                              {item.subActivities?.study && <span className="history-pill-tag study">📚 Study: {item.subActivities.study.duration_minutes}m</span>}
                            </div>
                          </div>
                        </div>

                        <div className="history-card-actions-cluster">
                          <button className="history-edit-btn" onClick={() => runEditLoadingSequence(item)}>Edit</button>
                          <button className="history-delete-btn" onClick={() => handleDeleteEntry(item.id)}>Delete</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* NEW ENTRY FORM */}
          {currentView === 'new-entry' && (
            <div className="entry-form-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>{isEditMode ? 'Edit Parameters Log Row' : 'Record Daily Parameters'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#9a8c98' }}>Logging Date:</label>
                  <input type="date" className="form-date-input" value={logTargetDate} onChange={e => setLogTargetDate(e.target.value)} disabled={isEditMode} />
                </div>
              </div>
              <p style={{ color: '#8d99ae', margin: '0 0 28px 0', fontSize: '14px' }}>Toggle and map unique, database-structured lifestyle tracking inputs below.</p>
              
              <form onSubmit={handleEntryFormSubmit}>
                <div className="entry-mood-flex-grid">
                  {[1, 2, 3, 4, 5].map(score => {
                    const TargetVector = MoodVectors[score];
                    return (
                      <button key={score} type="button" className={`mood-selection-btn ${selectedMood === score ? 'selected' : ''}`} onClick={() => setSelectedMood(score)}>
                        <div style={{ width: '36px', height: '36px' }}><TargetVector color={selectedMood === score ? moodMetaConfig[score].color : '#94a3b8'} /></div>
                        <span className="mood-btn-text">{moodMetaConfig[score].name}</span>
                      </button>
                    );
                  })}
                </div>

                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#4a4e69', borderBottom: '1px solid #e9ecef', paddingBottom: '8px' }}>Select Habits to Track Today:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                  
                  {/* SLEEP */}
                  <div className="habit-log-box" style={{ borderLeft: trackSleep ? '4px solid #4F46E5' : '1px solid #e9ecef' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={trackSleep} onChange={(e) => setTrackSleep(e.target.checked)} style={{ accentColor: '#81b29a', width: '16px', height: '16px' }} />
                      🛌 Sleep Schedule
                    </label>
                    {trackSleep && (
                      <div className="metrics-form-grid">
                        <div className="form-input-container"><label>Bedtime</label><input type="time" className="form-numerical-input" value={sleepStart} onChange={e => setSleepStart(e.target.value)} required /></div>
                        <div className="form-input-container"><label>Wake-up Time</label><input type="time" className="form-numerical-input" value={sleepEnd} onChange={e => setSleepEnd(e.target.value)} required /></div>
                      </div>
                    )}
                  </div>

                  {/* WATER */}
                  <div className="habit-log-box" style={{ borderLeft: trackWater ? '4px solid #06B6D4' : '1px solid #e9ecef' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={trackWater} onChange={(e) => setTrackWater(e.target.checked)} style={{ accentColor: '#81b29a', width: '16px', height: '16px' }} />
                      💧 Daily Hydration
                    </label>
                    {trackWater && (
                      <div className="form-input-container" style={{ marginTop: '16px', maxWidth: '280px' }}>
                        <label>Glasses Consumed (250ml each)</label>
                        <input type="number" min="1" placeholder="e.g. 8" className="form-numerical-input" value={waterGlasses} onChange={e => setWaterGlasses(e.target.value)} required />
                      </div>
                    )}
                  </div>

                  {/* EXERCISE */}
                  <div className="habit-log-box" style={{ borderLeft: trackExercise ? '4px solid #10B981' : '1px solid #e9ecef' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={trackExercise} onChange={(e) => setTrackExercise(e.target.checked)} style={{ accentColor: '#81b29a', width: '16px', height: '16px' }} />
                      🏃 Physical Exercise
                    </label>
                    {trackExercise && (
                      <div className="metrics-form-grid">
                        <div className="form-input-container"><label>Activity Type</label>
                          <select className="form-numerical-input" style={{ color: '#4a4e69' }} value={exerciseType} onChange={e => setExerciseType(e.target.value)}>
                            <option value="Running">Cardio / Running</option>
                            <option value="Gym">Gym / Weightlifting</option>
                            <option value="Yoga">Yoga / Flexibility</option>
                            <option value="Sports">Team Sports / Badminton</option>
                          </select>
                        </div>
                        <div className="form-input-container"><label>Duration (Minutes)</label><input type="number" min="1" placeholder="e.g. 45" className="form-numerical-input" value={exerciseDuration} onChange={e => setExerciseDuration(e.target.value)} required /></div>
                      </div>
                    )}
                  </div>

                  {/* STUDY */}
                  <div className="habit-log-box" style={{ borderLeft: trackStudy ? '4px solid #f39c12' : '1px solid #e9ecef' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={trackStudy} onChange={(e) => setTrackStudy(e.target.checked)} style={{ accentColor: '#81b29a', width: '16px', height: '16px' }} />
                      📚 Focus Study Session
                    </label>
                    {trackStudy && (
                      <div className="metrics-form-grid">
                        <div className="form-input-container"><label>Start Time</label><input type="time" className="form-numerical-input" value={studyStart} onChange={e => setStudyStart(e.target.value)} required /></div>
                        <div className="form-input-container"><label>End Time</label><input type="time" className="form-numerical-input" value={studyEnd} onChange={e => setStudyEnd(e.target.value)} required /></div>
                      </div>
                    )}
                  </div>

                </div>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Journaling Reflection Notes</label>
                <textarea className="form-notes-textarea" placeholder="Describe anything that impacted your wellness today..." value={journalNotes} onChange={e => setJournalNotes(e.target.value)} />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" disabled={isFormSubmitting} className="modal-action-btn-primary" style={{ margin: 0, flex: 2 }}>
                    {isFormSubmitting ? 'Syncing Parameters...' : (isEditMode ? 'Update Record Log' : 'Complete Daily Logs Generation')}
                  </button>
                  <button type="button" className="modal-action-btn-secondary" style={{ flex: 1 }} onClick={() => setCurrentView(isEditMode ? 'calendar' : 'history')}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* NOTIFICATION CENTER VIEW */}
          {currentView === 'notifications' && (
            <div>
              <div className="workspace-header">
                <h2>Notification Center</h2>
                <p style={{ color: '#8d99ae', margin: 0, fontSize: '14px' }}>
                  Respond to tracking authorizations requested by assigned practitioners or analyze automated alerts.
                </p>
              </div>

              <div className="notification-list-deck">
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', background: '#ffffff', padding: '60px', borderRadius: '16px', border: '1px solid #e9ecef', color: '#8d99ae' }}>
                    <p style={{ margin: 0, fontStyle: 'italic' }}>No active security alerts or professional access assignments recorded.</p>
                  </div>
                ) : (
                  notifications.map((note) => (
                    <div key={note.id} className="notification-card-item">
                      <div className="notification-left-block">
                        <div className={`notification-bell-icon-frame ${note.severity_level === 'high' ? 'alert-style' : ''}`}>
                          <DashboardIcons.Insights />
                        </div>
                        <div className="notification-text-details">
                          <h4>{note.title}</h4>
                          <p>{note.message}</p>
                          <span className="notification-timestamp-tag">
                            Received: {new Date(note.created_at).toLocaleDateString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="notification-actions-grid" style={{ display: 'flex', gap: '8px' }}>
                        {note.request_id ? (
                          <>
                            {/* AESTHETIC COMPLIANCE BUTTON LAYOUT REALIGNMENT */}
                            <button 
                              className="history-edit-btn" 
                              disabled={isProcessingAction}
                              onClick={() => handleResolveConsentTransaction(note.id, note.request_id, 'approved')}
                            >
                              Grant Access
                            </button>
                            <button 
                              className="history-delete-btn" 
                              disabled={isProcessingAction}
                              onClick={() => handleResolveConsentTransaction(note.id, note.request_id, 'rejected')}
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <button 
                            className="history-edit-btn" 
                            onClick={() => handleMarkNotificationAsRead(note.id)}
                          >
                            Dismiss Alert
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* DETAILED MODAL LAYER */}
      {isModalOpen && selectedDayLog && moodMetaConfig[selectedDayLog.mood_id] && (() => {
        const ModalVector = MoodVectors[selectedDayLog.mood_id];
        const config = moodMetaConfig[selectedDayLog.mood_id];

        return (
          <div className="modal-backdrop-layer" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header-row">
                <h3>Metrics Log: {currentDate.toLocaleString('default', { month: 'long' })} {selectedDayLog.day}, {year}</h3>
                <button className="close-modal-x" onClick={() => setIsModalOpen(false)}>×</button>
              </div>

              <div className={`modal-mood-banner ${config.class}`}>
                <div className="modal-mood-icon-fixed">
                  {ModalVector && <ModalVector color={config.color} />}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#4a4e69' }}>Emotional State Index</h4>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{config.name}</p>
                </div>
              </div>

              <h4 style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#4a4e69' }}>Tracked Activities:</h4>
              <div className="modal-metrics-display-box">
                {selectedDayLog.subActivities?.sleep ? (
                  <div className="modal-metric-pill" style={{ borderLeftColor: '#4F46E5' }}>
                    <span>🛌 <strong>Sleep Log:</strong> {selectedDayLog.subActivities.sleep.start_time?.slice(0,5)} - {selectedDayLog.subActivities.sleep.end_time?.slice(0,5)}</span>
                    <strong>{selectedDayLog.subActivities.sleep.duration_hours} hrs</strong>
                  </div>
                ) : <div className="modal-metric-pill" style={{ opacity: 0.5 }}>🛌 No Sleep Schedule Logged</div>}

                {selectedDayLog.subActivities?.water ? (
                  <div className="modal-metric-pill" style={{ borderLeftColor: '#06B6D4' }}>
                    <span>💧 <strong>Hydration:</strong> {selectedDayLog.subActivities.water.glasses_count} Glasses</span>
                    <strong>{selectedDayLog.subActivities.water.liters_consumed} L</strong>
                  </div>
                ) : <div className="modal-metric-pill" style={{ opacity: 0.5 }}>💧 No Hydration Logged</div>}

                {selectedDayLog.subActivities?.exercise ? (
                  <div className="modal-metric-pill" style={{ borderLeftColor: '#10B981' }}>
                    <span>🏃 <strong>Exercise:</strong> {selectedDayLog.subActivities.exercise.exercise_type}</span>
                    <strong>{selectedDayLog.subActivities.exercise.duration_minutes} min</strong>
                  </div>
                ) : <div className="modal-metric-pill" style={{ opacity: 0.5 }}>🏃 No Exercise Logged</div>}

                {selectedDayLog.subActivities?.study ? (
                  <div className="modal-metric-pill" style={{ borderLeftColor: '#f39c12' }}>
                    <span>📚 <strong>Study Session:</strong> {selectedDayLog.subActivities.study.start_time?.slice(0,5)} - {selectedDayLog.subActivities.study.end_time?.slice(0,5)}</span>
                    <strong>{selectedDayLog.subActivities.study.duration_minutes} min</strong>
                  </div>
                ) : <div className="modal-metric-pill" style={{ opacity: 0.5 }}>📚 No Study Session Logged</div>}
              </div>

              <h4 style={{ fontSize: '13px', margin: '0 0 6px 0', color: '#4a4e69' }}>Reflections Summary:</h4>
              <div className="modal-notes-block">{selectedDayLog.notes || "No annotations recorded."}</div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button className="modal-action-btn-primary" onClick={() => runEditLoadingSequence(selectedDayLog)}>✏️ Edit Entry</button>
                <button className="history-delete-btn" style={{ padding: '12px' }} onClick={() => handleDeleteEntry(selectedDayLog.id)}>🗑️ Delete</button>
                <button className="modal-action-btn-secondary" onClick={() => setIsModalOpen(false)}>Dismiss</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default UserDashboard;