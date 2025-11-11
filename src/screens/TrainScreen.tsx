import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  LayoutAnimation, UIManager, Platform, TextInput, ScrollView, Animated
} from "react-native";
import { colors, spacing, shadow } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import type { Exercise, Template } from "../types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { popCancelDone, popConfirmDone } from "../storage";
import { popLastAddedExerciseTemp } from "../storage/lastAdded";
import { DEFAULT_EXERCISES } from "../constants/exercises";
import { TEMPLATE_ICON_MAP } from "../constants/templateIcons";
import { DEFAULT_TEMPLATES } from "../constants/defaultTemplates";
import { getSelectedTemplateId, setSelectedTemplateId, loadTemplates } from "../storage/templates";
import { fetchCustomExercises } from "../storage/customExercises";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { LinearGradient } from "expo-linear-gradient";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
type Nav = NativeStackNavigationProp<RootStackParamList>;

type SetRowVM = { id: string; weight?: number; reps?: number; timeMin?: number; distance?: number };
type ExVM = Exercise & { sets: SetRowVM[]; expanded?: boolean };

type TemplateWithFav = Template & { favorite?: boolean; favoriteAt?: string };

type DbWorkout = {
  id: string;
  name: string;
  started_at: string;
  duration_sec: number;
  payload?: { exercises?: { id: string; sets?: any[] }[] };
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const FEATURED_DEFAULT_IDS = ["bench", "deadlift", "squat", "pullup"] as const;

/* helpers */
function plural(n: number, one: string, many: string) { return `${n} ${n === 1 ? one : many}`; }
function ordinal(n: number) { const s=["th","st","nd","rd"],v=n%100; return n + (s[(v-20)%10] || s[v] || s[0]); }
function hoursAgo(iso: string) { const h=Math.floor((Date.now()-new Date(iso).getTime())/36e5); return h<24?`${h}h ago`:`${Math.floor(h/24)} days ago`; }
function startOfWeek(d=new Date()){const day=d.getDay();const diff=(day===0?-6:1)-day;const res=new Date(d);res.setDate(d.getDate()+diff);res.setHours(0,0,0,0);return res;}
function autoColorFromString(s: string){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;const hue=Math.abs(h)%360;return `hsl(${hue},55%,45%)`;}
function hexToRgba(hex: string, alpha: number){ const h = hex.replace("#",""); const b = h.length===3? h.split("").map(c=>c+c).join(""):h; const r=parseInt(b.slice(0,2),16), g=parseInt(b.slice(2,4),16), bl=parseInt(b.slice(4,6),16); return `rgba(${r},${g},${bl},${alpha})`; }

export const TrainScreen = () => {
  const nav = useNavigation<Nav>();
  const focused = useIsFocused();
  const { session } = useAuth();
  const userId = session?.user?.id ?? "";
  const userEmail = session?.user?.email ?? "";

  const [active, setActive] = useState(false);
  const [name, setName] = useState("Workout");
  const [exList, setExList] = useState<ExVM[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  // templates (z ulubionymi)
  const [templates, setTemplates] = useState<TemplateWithFav[]>([]);
  const [selectedTplId, setSelectedTplId] = useState<string | null>(null);

  // custom exercises
  const [customDb, setCustomDb] = useState<Exercise[]>([]);
  const [sessionFeaturedIds, setSessionFeaturedIds] = useState<Set<string>>(new Set());

  // profile avatar & goal
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(3); // domyślnie 3

  // last workout
  const [lastWorkout, setLastWorkout] = useState<DbWorkout | null>(null);
  const [thisWeekCount, setThisWeekCount] = useState<number>(0);

  /* timer */
  useEffect(() => {
    let t: NodeJS.Timer | null = null;
    if (active) {
      if (!startRef.current) startRef.current = Date.now() - elapsed;
      t = setInterval(() => startRef.current && setElapsed(Date.now() - startRef.current!), 1000);
    } else { startRef.current = null; setElapsed(0); }
    return () => t && clearInterval(t);
  }, [active]);

  /* load data on focus */
  useEffect(() => {
    (async () => {
      const userTpls = await loadTemplates();
      // połącz z defaultami (defaulty nie mają fav)
      setTemplates([...(DEFAULT_TEMPLATES as TemplateWithFav[]), ...(userTpls || [])]);
      const sel = await getSelectedTemplateId(); setSelectedTplId(sel || null);
      const cx = await fetchCustomExercises(); setCustomDb(cx);
      await Promise.all([loadProfile(), loadLastAndWeek()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const loadProfile = useCallback(async () => {
    if (!userId) { setDisplayName(null); setAvatarColor(null); setWeeklyGoal(3); return; }
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_color, workouts_per_week")
      .eq("id", userId)
      .maybeSingle();
    if (error){ setDisplayName(null); setAvatarColor(null); setWeeklyGoal(3); return; }
    setDisplayName(data?.display_name ?? null);
    setAvatarColor((data as any)?.avatar_color ?? null);
    const goal = Number(data?.workouts_per_week ?? 3);
    setWeeklyGoal(goal > 0 ? goal : 3);
  }, [userId]);

  const loadLastAndWeek = useCallback(async () => {
    const { data: last } = await supabase
      .from("workouts")
      .select("id,name,started_at,duration_sec,payload")
      .order("started_at", { ascending: false }).limit(1);
    setLastWorkout(last?.[0] ?? null);

    const since = startOfWeek();
    const { count } = await supabase
      .from("workouts").select("id", { count: "exact", head: true })
      .gte("started_at", since.toISOString());
    setThisWeekCount(count || 0);
  }, []);

  /* consume lastAdded */
  useFocusEffect(React.useCallback(() => {
    let alive = true;
    (async () => {
      const just = await popLastAddedExerciseTemp();
      if (!alive || !just) return;
      setCustomDb((prev) => [just, ...prev.filter((p) => p.id !== just.id)]);
      if (active) {
        setExList((prev) => prev.find((p) => p.id === just.id) ? prev : [...prev, { ...just, sets: [], expanded: true }]);
        setSessionFeaturedIds((prev) => { const next = new Set(prev); next.add(just.id); return next; });
        LayoutAnimation.configureNext(LayoutAnimation.create(140, "easeInEaseOut", "opacity"));
      }
    })();
    return () => { alive = false; };
  }, [active]));

  /* flags from Summary */
  useEffect(() => { (async () => {
    const ok = await popConfirmDone(); if (ok) { clearState(); await loadLastAndWeek(); return; }
    const cancel = await popCancelDone(); if (cancel) clearState();
  })(); }, [focused, loadLastAndWeek]);

  function clearState(){
    setActive(false); setExList([]); setName("Workout");
    startRef.current=null; setElapsed(0); setSessionFeaturedIds(new Set());
  }

  const subtitle = useMemo(()=> active?`Time: ${formatTime(elapsed)}`:"", [active,elapsed]);
  const isCardio = (ex:Exercise) => (ex.muscleGroup||"").toLowerCase()==="cardio";
  const newDefaultSet = (ex:Exercise):SetRowVM => isCardio(ex)? {id:uid(), timeMin:5, distance:0.5}:{id:uid(), weight:20, reps:8};

  // --- PODMIEŃ W src/screens/TrainScreen.tsx ---
function addDefault(ex: Exercise) {
  setExList((p) =>
    p.find((e) => e.id === ex.id)
      ? p
      : [...p, { ...ex, sets: [], expanded: false }] // ⬅️ zwinięte po dodaniu
  );
  setSessionFeaturedIds((prev) => new Set(prev).add(ex.id));
  LayoutAnimation.configureNext(LayoutAnimation.create(140, "easeInEaseOut", "opacity"));
}
  function toggleExpand(id:string){
    LayoutAnimation.configureNext(LayoutAnimation.create(140, 'easeInEaseOut', 'opacity'));
    setExList(p=>p.map(e=>e.id===id?{...e,expanded:!e.expanded}:e));
  }
  function addSet(id:string){ setExList(p=>p.map(e=>e.id===id?{...e,sets:[...e.sets,newDefaultSet(e)]}:e)); }
  function modSet(exId:string,setId:string,delta:Partial<SetRowVM>){
    setExList(p=>p.map(e=> e.id===exId? {...e,sets:e.sets.map(s=>s.id===setId?{...s,...delta}:s)}:e));
  }
  function removeSet(exId:string,setId:string){ setExList(p=>p.map(e=> e.id===exId? {...e,sets:e.sets.filter(s=>s.id!==setId)}:e)); }
  function removeExercise(exId:string){
    LayoutAnimation.configureNext(LayoutAnimation.create(140, 'easeInEaseOut', 'opacity'));
    setExList(p=> p.filter(e=>e.id!==exId));
    setSessionFeaturedIds(prev => new Set(prev).add(exId));
  }
  function finishPreview(){
    if(!active) return;
    nav.navigate("WorkoutDetail",{ preview:{
      id:"preview", name, startedAt:Date.now()-elapsed, durationSec:Math.floor(elapsed/1000),
      exercises: exList.map(e=>({id:e.id,name:e.name,muscleGroup:e.muscleGroup,sets:e.sets}))
    }, mode:"preview" });
  }

  const allById = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const e of DEFAULT_EXERCISES) map.set(e.id, e);
    for (const e of customDb) map.set(e.id, e);
    return map;
  }, [customDb]);

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTplId) || null,
    [templates, selectedTplId]
  );

  const featuredFromTemplate: Exercise[] = useMemo(() => {
    if (!selectedTemplate) return [];
    return (selectedTemplate.exerciseIds || []).map(id => allById.get(id)).filter(Boolean) as Exercise[];
  }, [selectedTemplate, allById]);

  const fallbackFeatured: Exercise[] = useMemo(() => {
    const byId = new Map(DEFAULT_EXERCISES.map(e => [e.id, e]));
    return FEATURED_DEFAULT_IDS.map(id => byId.get(id)).filter(Boolean) as Exercise[];
  }, []);

  const sessionFeatured: Exercise[] = useMemo(() => {
    const out: Exercise[] = [];
    sessionFeaturedIds.forEach((id) => { const ex = allById.get(id); if (ex) out.push(ex); });
    return out;
  }, [sessionFeaturedIds, allById]);

  function uniqById<T extends { id: string }>(arr: T[]): T[] {
    const seen = new Set<string>(); const out: T[] = [];
    for (const it of arr) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
    return out;
  }

  const visibleFeatured = useMemo(() => {
    const base = featuredFromTemplate.length ? featuredFromTemplate : fallbackFeatured;
    const merged = uniqById<Exercise>([...base, ...sessionFeatured]);
    return merged.filter(d => !exList.some(e => e.id === d.id));
  }, [featuredFromTemplate, fallbackFeatured, sessionFeatured, exList]);

  // --- SORT: ulubione na górze (nowszy favouriteAt -> wyżej), potem reszta (zachowaj kolejność)
  const sortedTemplates = useMemo(() => {
    const favs: TemplateWithFav[] = [];
    const rest: TemplateWithFav[] = [];
    templates.forEach(t => (t.favorite ? favs.push(t) : rest.push(t)));
    favs.sort((a,b) => {
      const ta = a.favoriteAt ? Date.parse(a.favoriteAt) : 0;
      const tb = b.favoriteAt ? Date.parse(b.favoriteAt) : 0;
      return tb - ta;
    });
    return [...favs, ...rest];
  }, [templates]);

  async function onPickTemplate(t: TemplateWithFav | "create") {
    if (t === "create") { nav.navigate("TemplateEditor" as never); return; }
    if (selectedTplId === t.id) {
      setSelectedTplId(null);
      try { await setSelectedTemplateId(null); } catch {}
      return;
    }
    setSelectedTplId(t.id);
    try { await setSelectedTemplateId(t.id); } catch {}
  }

  // avatar
  const initial = (displayName || userEmail || "?").trim().charAt(0).toUpperCase() || "?";
  const avatarBg = avatarColor || autoColorFromString(displayName || userEmail || "user");

  // last workout stats
  const lastStats = useMemo(() => {
    if (!lastWorkout) return null;
    const ex = lastWorkout.payload?.exercises ?? [];
    const totalSets = ex.reduce((sum, e) => sum + (e.sets?.length || 0), 0);
    const exercisesCount = ex.length;
    return { totalSets, exercisesCount };
  }, [lastWorkout]);

  function progressMeta(n: number) {
    if (n <= 0) return { pct: 0.05, colors: ["#3a3f47", "#3a3f47"], text: "No workouts yet" };
    if (n === 1) return { pct: 0.22, colors: ["#FF6A3C", "#FF5A3C"], text: `${ordinal(n)} workout this week: Good start!` };
    if (n === 2) return { pct: 0.45, colors: ["#FFB84D", "#FFC34D"], text: `${ordinal(n)} workout this week: Keep it up!` };
    if (n === 3) return { pct: 0.70, colors: ["#7EDB6A", "#9AD96A"], text: `${ordinal(n)} workout this week: Great pace!` };
    if (n === 4) return { pct: 0.90, colors: ["#46D964", "#5AD65A"], text: `${ordinal(n)} workout this week: Awesome job!` };
    if (n === 5) return { pct: 1.00, colors: ["#2FC84A", "#35C84A"], text: `${ordinal(n)} workout this week: You’ve done it!` };
    return { pct: 1.00, colors: ["#27B83E", "#2BBF3E"], text: `${ordinal(n)} workout this week: Time for a rest day!` };
  }

  /** Animated progress — skala do goal */
  const progAnim = useRef(new Animated.Value(0)).current;
  const ratio = Math.max(0, Math.min(1, thisWeekCount / Math.max(weeklyGoal || 1, 1)));
  const meta = progressMeta(thisWeekCount);
  useEffect(() => {
    Animated.timing(progAnim, { toValue: ratio, duration: 450, useNativeDriver: false }).start();
  }, [ratio]);

  const progWidth = progAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  function ProgressBar() {
    return (
      <View style={st.pbWrap}>
        <Animated.View style={[st.pbFillWrap, { width: progWidth }]}>
          <LinearGradient
            colors={meta.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    );
  }

  function LastWorkoutCard() {
    const goal = Math.max(weeklyGoal || 1, 1);
    const ratioText = `${Math.min(thisWeekCount, goal)}/${goal} workouts this week`;
    if (!lastWorkout) {
      return (
        <View style={st.lastCard}>
          <Text style={st.miniLabel}>Welcome</Text>
          <Text style={st.lastTitleWelcome}>Start Your Journey</Text>
          <Text style={st.lastSub}>Begin your first workout below</Text>
          <View style={{ height: spacing(1.5) }} />
          <ProgressBar />
          <Text style={st.pbText}>{ratioText}: {meta.text.replace(/^[0-9]+(st|nd|rd|th) /, "")}</Text>
        </View>
      );
    }
    const exC = lastStats?.exercisesCount ?? 0;
    const setC = lastStats?.totalSets ?? 0;

    return (
      <View style={st.lastCard}>
        <View style={st.lastHeaderRow}>
          <Text style={st.miniLabel}>Last workout</Text>
          <Text style={st.lastAgo}>{hoursAgo(lastWorkout.started_at)}</Text>
        </View>

        <Text style={st.lastTitle} numberOfLines={1}>{lastWorkout.name || "Workout"}</Text>

        <View style={st.lastMetaRow}>
          <Ionicons name="time-outline" size={14} color={colors.subtext} />
          <Text style={st.lastMeta}>
            {Math.max(1, Math.floor((lastWorkout.duration_sec || 0) / 60))} min
          </Text>
          <Text style={st.lastDot}>•</Text>
          <Text style={st.lastMeta}>{plural(exC, "exercise", "exercises")}</Text>
          <Text style={st.lastDot}>•</Text>
          <Text style={st.lastMeta}>{plural(setC, "set", "sets")}</Text>
        </View>

        <ProgressBar />
        <Text style={st.pbText}>{ratioText}: {meta.text.replace(/^[0-9]+(st|nd|rd|th) /, "")}</Text>
      </View>
    );
  }

  // start workout: jeśli nic nie wybrane → domyślne 4 ćwiczenia (DOMYŚLNIE ZWINIĘTE)
  // --- PODMIEN TĘ FUNKCJĘ W src/screens/TrainScreen.tsx ---
// --- PODMIEŃ W src/screens/TrainScreen.tsx ---
function startWorkout() {
  // Startujemy tryb treningu, ale NIE dodajemy żadnych ćwiczeń na listę.
  setActive(true);
  setExList((prev) => (prev.length > 0 ? prev : []));
}

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.container}>
        {!active ? (
          <View style={st.topBar}>
            <Text style={st.title}>{name}</Text>
            <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
              <TouchableOpacity onPress={() => nav.navigate("Settings" as never)} style={st.topIconBtn}
                hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
                <Ionicons name="settings-outline" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => nav.navigate("Profile" as never)} style={st.avatarBtn}
                hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
                <View style={[st.avatarCircle,{backgroundColor:avatarBg}]}>
                  <Text style={st.avatarInitial}>{(displayName||userEmail||"?").trim().charAt(0).toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={st.headerActive}>
            <View>
              <Text style={st.title}>{name}</Text>
              <Text style={st.subtitleRow}>
                <Ionicons name="time-outline" size={14} color={colors.subtext} /> <Text style={st.subtitle}>{subtitle}</Text>
              </Text>
            </View>
            <TouchableOpacity style={[st.pillButton,{backgroundColor:"#2E3136"}]} onPress={clearState}>
              <Ionicons name="close" size={18} color={colors.text}/><Text style={st.pillText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {!active ? (
          <>
            <Text style={st.heroLine}>Ready to push your limits?</Text>

            <View style={{ marginTop: spacing(2), marginBottom: spacing(2.4) }}>
              <LastWorkoutCard />
            </View>

            <View style={{ marginBottom: spacing(2.6) }}>
              <TouchableOpacity style={st.ctaPrimary} onPress={startWorkout}>
                <Text style={st.ctaPrimaryText}>Start workout</Text>
              </TouchableOpacity>
            </View>

            {/* Nagłówek przyklejony */}
            <View style={st.tplHeader}>
              <Text style={st.sectionTitle}>Templates</Text>
              {selectedTplId ? (
                <TouchableOpacity onPress={()=>nav.navigate("TemplateEditor" as never, { id: selectedTplId } as never)}>
                  <Text style={st.editLink}>Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Scrollują się tylko kafelki – jedna lista, ulubione są po prostu na górze */}
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ paddingBottom: spacing(8) }} showsVerticalScrollIndicator={false}>
                <View style={st.tplGrid}>
                  {sortedTemplates.map((t) => (
                    <TemplateCardComp key={t.id} t={t} active={t.id === selectedTplId} onPick={onPickTemplate} />
                  ))}

                  {/* Kafelek „Custom” – ciemniejszy + dashed */}
                  <TouchableOpacity onPress={() => onPickTemplate("create")} style={[st.tplCard, st.tplCreate]} activeOpacity={0.9}>
                    <View style={st.tplCreateDash} />
                    <View style={st.tplIconWrap}>
                      <Ionicons name="add" size={24} color={colors.text} />
                    </View>
                    <Text style={st.tplName}>Custom</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Subtelny shade w kolorze tła */}
              <LinearGradient
                pointerEvents="none"
                colors={["transparent", hexToRgba(colors.bg as any, 0.94)]}
                style={st.bottomShade}
              />
            </View>
          </>
        ) : (
          <>
            <FlatList
              style={{flex:1}} data={exList} keyExtractor={it=>it.id}
              ListEmptyComponent={<Text style={{color:colors.subtext,textAlign:"center",marginTop:spacing(6)}}>No exercises yet. Add one below.</Text>}
              renderItem={({item})=>(
                <View style={st.exerciseCard}>
                  <TouchableOpacity onPress={()=>toggleExpand(item.id)} style={st.exerciseHeader}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                      <View style={st.iconBadge}><Ionicons name="barbell" size={16} color={colors.text}/></View>
                      <Text style={st.exerciseName}>{item.name}</Text>
                    </View>
                    <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
                      <Text style={st.setHint}>{item.sets.length} sets</Text>
                      {item.expanded && (<TouchableOpacity onPress={()=>removeExercise(item.id)}><Ionicons name="trash-outline" size={18} color={colors.subtext}/></TouchableOpacity>)}
                    </View>
                  </TouchableOpacity>

                  {item.expanded && (
                    <View style={{marginTop:spacing(1)}}>
                      {item.sets.map((s,idx)=>(
                        <View key={s.id} style={st.setRow}>
                          <Text style={st.setIndex}>{idx+1}</Text>

                          {!isCardio(item) ? (
                            <>
                              <NumCounter label="kg" mode="float" maxDigits={4}
                                value={s.weight ?? 20}
                                onMinus={() => modSet(item.id,s.id,{weight:Math.max(0,(s.weight??20)-2.5)})}
                                onPlus={() => modSet(item.id,s.id,{weight:(s.weight??20)+2.5})}
                                onType={(v)=>modSet(item.id,s.id,{weight:v})}
                              />
                              <NumCounter label="reps" mode="int" maxDigits={4}
                                value={s.reps ?? 8}
                                onMinus={() => modSet(item.id,s.id,{reps:Math.max(0,(s.reps??8)-1)})}
                                onPlus={() => modSet(item.id,s.id,{reps:(s.reps??8)+1})}
                                onType={(v)=>modSet(item.id,s.id,{reps:Math.max(0, Math.floor(v))})}
                              />
                            </>
                          ) : (
                            <>
                              <NumCounter label="km"
                                value={s.distance ?? 0.5}
                                onMinus={() => modSet(item.id,s.id,{distance:Math.max(0, round1((s.distance??0.5)-0.1))})}
                                onPlus={() => modSet(item.id,s.id,{distance:round1((s.distance??0.5)+0.1)})}
                                onType={(v)=>modSet(item.id,s.id,{distance:v})}
                              />
                              <NumCounter label="min"
                                value={s.timeMin ?? 5}
                                onMinus={() => modSet(item.id,s.id,{timeMin:Math.max(0,(s.timeMin??5)-1)})}
                                onPlus={() => modSet(item.id,s.id,{timeMin:(s.timeMin ?? 5) + 1})}
                                onType={(v)=>modSet(item.id,s.id,{timeMin:v})}
                              />
                            </>
                          )}

                          <TouchableOpacity onPress={()=>removeSet(item.id,s.id)} style={st.trashBtn}>
                            <Ionicons name="trash-outline" size={18} color={colors.subtext}/>
                          </TouchableOpacity>
                        </View>
                      ))}

                      <TouchableOpacity style={st.addSetBtn} onPress={()=>addSet(item.id)}>
                        <Ionicons name="add" size={18} color={colors.text}/><Text style={st.addSetTxt}>Add set</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              contentContainerStyle={{paddingBottom:spacing(18)}}
            />

            <View style={st.bottomDock}>
              <View style={st.quickHeader}>
                <Text style={st.sectionTitle}>Add exercise</Text>
                <TouchableOpacity onPress={()=>nav.navigate("AddExercise")}><Text style={{color:colors.accent,fontWeight:"700"}}>Custom +</Text></TouchableOpacity>
              </View>
              <View style={st.chipsRow}>
                {visibleFeatured.map(ex=>(
                  <TouchableOpacity key={ex.id} style={st.chip} onPress={()=>addDefault(ex)}>
                    <Text style={st.chipText}>{ex.name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[st.chip,st.searchChip]} onPress={()=>nav.navigate("SearchExercise")}>
                  <Ionicons name="search-outline" size={14} color={colors.text}/><Text style={st.chipText}>Search</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[st.ctaPrimary,{marginTop:spacing(2)}]} onPress={finishPreview}>
                <Text style={st.ctaPrimaryText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

function TemplateCardComp({
  t, active, onPick,
}: { t: { id: string; name: string; icon: string; favorite?: boolean }; active: boolean; onPick: (tpl: any) => void; }) {
  return (
    <TouchableOpacity onPress={() => onPick(t)} onLongPress={() => onPick(t)}
      style={[st.tplCard, active && st.tplCardActive]} activeOpacity={0.9}>
      {/* gwiazdka tylko dla ulubionych */}
      {t.favorite ? (
        <View style={st.starBadge}>
          <Ionicons name="star" size={14} color="#FFD166" />
        </View>
      ) : null}
      <View style={st.tplIconWrap}>
        <Ionicons name={TEMPLATE_ICON_MAP[t.icon]} size={24} color={active ? "#FFFFFF" : colors.text} />
      </View>
      <Text style={[st.tplName, active && { color: "#FFFFFF" }]} numberOfLines={1}>{t.name}</Text>
    </TouchableOpacity>
  );
}

function NumCounter({
  label, value, onMinus, onPlus, onType, mode="float", maxDigits=4,
}: { label: string; value: number; onMinus: () => void; onPlus: () => void; onType: (v:number)=>void; mode?: "int"|"float"; maxDigits?: number; }) {
  const [text, setText] = React.useState(String(value ?? ""));
  React.useEffect(()=>{ const as = text===""?"":String(value ?? ""); if (as!==text) setText(as); },[value]); // eslint-disable-line
  function applyLimitAndSet(t:string){ if(t===""){setText("");return;} t=t.replace(",",".");
    if(mode==="int"){ t=t.replace(/\D+/g,""); } else { t=t.replace(/[^0-9.]/g,""); const parts=t.split("."); if(parts.length>2) t=parts[0]+"."+parts.slice(1).join(""); }
    const [intP, frac=""]=t.split("."); const limited=intP.slice(0,maxDigits);
    t=mode==="float"?(frac!==""?`${limited}.${frac}`:limited):limited; setText(t);
  }
  function commit(){ if(text==="") return; const num=Number(text); if(!Number.isNaN(num)) onType(num); }
  return (
    <View style={st.counter}>
      <TouchableOpacity onPress={onMinus} style={st.counterBtn}><Ionicons name="remove" size={16} color={colors.text} /></TouchableOpacity>
      <TextInput style={st.counterInput} value={text} keyboardType="numeric" inputMode="decimal"
        onChangeText={applyLimitAndSet} onBlur={()=>{ if(text===""){setText("0"); onType(0); return;} commit(); }} returnKeyType="done" blurOnSubmit />
      <TouchableOpacity onPress={onPlus} style={st.counterBtn}><Ionicons name="add" size={16} color={colors.text} /></TouchableOpacity>
      <Text style={st.counterLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function formatTime(ms:number){const s=Math.floor(ms/1000);const m=Math.floor(s/60);const r=s%60;return `${m}:${r.toString().padStart(2,"0")}`;}
function round1(n:number){return Math.round(n*10)/10;}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},
  container:{flex:1,paddingHorizontal:spacing(2)},

  topBar:{paddingVertical:spacing(1.1),flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  topIconBtn:{padding:8,borderRadius:10,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border},

  avatarBtn:{width:36,height:36,borderRadius:10,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,alignItems:"center",justifyContent:"center",padding:2},
  avatarCircle:{width:28,height:28,borderRadius:14,alignItems:"center",justifyContent:"center"},
  avatarInitial:{color:"#fff",fontWeight:"800",fontSize:13,includeFontPadding:false},

  headerActive:{paddingVertical:spacing(1.8),flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  title:{color:colors.text,fontSize:26,fontWeight:"800"},
  subtitleRow:{flexDirection:"row",alignItems:"center",gap:6,marginTop:4},
  subtitle:{color:colors.subtext},

  heroLine:{ color: colors.subtext, fontSize: 17, marginTop: spacing(0.5) },

  lastCard:{ backgroundColor:colors.card, borderRadius:18, padding:spacing(2), borderWidth:1, borderColor:colors.border },
  miniLabel:{ color: colors.subtext, fontWeight: "600", letterSpacing: 0.2 },
  lastHeaderRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  lastAgo:{ color: colors.subtext },
  lastTitle:{ color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 6 },
  lastTitleWelcome:{ color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 4 },
  lastSub:{ color: colors.subtext, marginTop: 4 },

  lastMetaRow:{ flexDirection:"row", alignItems:"center", gap:8, marginTop:8, marginBottom:10 },
  lastMeta:{ color: colors.subtext },
  lastDot:{ color: colors.subtext },

  pbWrap:{ height:10, borderRadius:8, backgroundColor:"#24272C", overflow:"hidden" },
  pbFillWrap:{ height:"100%", borderRadius:8 },

  pbText:{ color: colors.subtext, marginTop:8, fontSize:12 },

  ctaPrimary:{ backgroundColor: colors.accent, paddingVertical: spacing(2.4), alignItems:"center", borderRadius:16, ...shadow },
  ctaPrimaryText:{ color:"#FFFFFF", fontSize:18, fontWeight:"800" },

  tplHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:spacing(1.2)},
  sectionTitle:{color:colors.text,fontSize:18,fontWeight:"700"},
  editLink:{color:colors.subtext,textDecorationLine:"underline",fontSize:13},

  tplGrid:{ flexDirection:"row", flexWrap:"wrap", justifyContent:"space-between", rowGap:14, columnGap:14 },
  tplCard:{ width:"48%", backgroundColor:colors.card, borderRadius:18, padding:spacing(2.2), borderWidth:1.2, borderColor:colors.border, overflow:"hidden", marginBottom:14 },
  tplCardActive:{ borderColor: colors.accent },
  tplIconWrap:{width:50,height:50,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:colors.muted,marginBottom:12},
  tplName:{color:colors.text,fontWeight:"800",fontSize:15},

  tplCreate:{ backgroundColor: "#111418" },
  tplCreateDash:{ position:"absolute", inset:0 as any, borderWidth:1.2, borderColor:colors.border, borderStyle:"dashed", borderRadius:18 },

  starBadge:{ position:"absolute", top:8, right:8, width:22, height:22, borderRadius:11, backgroundColor:"#2b2f36", alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#3a3f47", zIndex:2 },

  bottomDock:{backgroundColor:colors.bg,paddingTop:spacing(2),paddingHorizontal:spacing(2),paddingBottom:spacing(2),borderTopWidth:1,borderTopColor:colors.border},
  quickHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:spacing(1)},
  chipsRow:{flexDirection:"row",flexWrap:"wrap",gap:8},
  chip:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:colors.muted,paddingVertical:10,paddingHorizontal:14,borderRadius:12,marginRight:8,marginBottom:8},
  chipText:{color:colors.text,fontSize:14,fontWeight:"600"},
  searchChip:{backgroundColor:"#2A2D33"},

  exerciseCard:{backgroundColor:colors.card,borderRadius:16,padding:spacing(2.2),marginBottom:spacing(1.8),borderWidth:1,borderColor:colors.border},
  exerciseHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  iconBadge:{backgroundColor:colors.muted,width:30,height:30,borderRadius:10,alignItems:"center",justifyContent:"center"},
  exerciseName:{color:colors.text,fontSize:16,fontWeight:"600"},
  setHint:{color:colors.subtext,fontSize:12},
  pillButton:{flexDirection:"row",alignItems:"center",gap:6,paddingVertical:8,paddingHorizontal:12,borderRadius:999},
  pillText:{color:colors.text,fontWeight:"600"},

  setRow:{flexDirection:"row",alignItems:"center",paddingVertical:8},
  setIndex:{color:colors.subtext,width:18,textAlign:"right",marginRight:6},

  addSetBtn:{flexDirection:"row",gap:6,alignItems:"center",paddingVertical:8},
  addSetTxt:{color:colors.text,fontWeight:"600"},

  counter:{flex:1, minWidth:100, maxWidth:152, flexDirection:"row", alignItems:"center", backgroundColor:colors.muted, borderRadius:10, paddingHorizontal:6, paddingVertical:6, marginRight:6},
  counterBtn:{paddingHorizontal:4,paddingVertical:2},
  counterInput:{flexGrow:1, minWidth:34, maxWidth:60, color:colors.text, textAlign:"center", fontWeight:"700", paddingVertical:0, paddingHorizontal:2},
  counterLabel:{color:colors.subtext, marginLeft:4, fontSize:10, flexShrink:0},
  trashBtn:{marginLeft:8, padding:6},

  // subtelny shade w kolorze tła
  bottomShade:{ position:"absolute", left:0, right:0, bottom:0, height:40 },
});