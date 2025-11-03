import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  LayoutAnimation, UIManager, Platform, TextInput, ScrollView
} from "react-native";
import { colors, spacing, shadow } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import type { Exercise, Template } from "../types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { popCancelDone, popConfirmDone, popLastAddedExerciseTemp } from "../storage";
import { DEFAULT_EXERCISES, normalizeName } from "../constants/exercises";
import { TEMPLATE_ICON_MAP } from "../constants/templateIcons";
import { DEFAULT_TEMPLATES } from "../constants/defaultTemplates";
import { getSelectedTemplateId, setSelectedTemplateId, loadTemplates } from "../storage/templates";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
type Nav = NativeStackNavigationProp<RootStackParamList>;

type SetRowVM = { id: string; weight?: number; reps?: number; timeMin?: number; distance?: number };
type ExVM = Exercise & { sets: SetRowVM[]; expanded?: boolean };

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// fallback gdy brak template'u
const FEATURED_DEFAULT_IDS = ["bench", "deadlift", "squat", "pullup"] as const;

export const TrainScreen = () => {
  const nav = useNavigation<Nav>();
  const focused = useIsFocused();
  const [active, setActive] = useState(false);
  const [name, setName] = useState("Workout");
  const [exList, setExList] = useState<ExVM[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  // templates UI
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTplId, setSelectedTplId] = useState<string | null>(null);

  // timer
  useEffect(() => {
    let t: NodeJS.Timer | null = null;
    if (active) {
      if (!startRef.current) startRef.current = Date.now() - elapsed;
      t = setInterval(() => startRef.current && setElapsed(Date.now() - startRef.current!), 1000);
    } else {
      startRef.current = null; setElapsed(0);
    }
    return () => t && clearInterval(t);
  }, [active]);

  // load templates on focus
  useEffect(() => { (async () => {
    const user = await loadTemplates();
    setTemplates([...DEFAULT_TEMPLATES, ...user]);
    const sel = await getSelectedTemplateId();
    setSelectedTplId(sel);
  })(); }, [focused]);

  // last added exercise (from modals)
  useEffect(() => { (async () => {
    if (!active) return;
    const custom = await popLastAddedExerciseTemp();
    if (custom) setExList(prev => prev.find(p => p.id===custom.id)? prev : [...prev, {...custom, sets:[], expanded:true}]);
  })(); }, [focused, active]);

  // flags from Summary
  useEffect(() => { (async () => {
    const ok = await popConfirmDone(); if (ok) return clearState();
    const cancel = await popCancelDone(); if (cancel) clearState();
  })(); }, [focused]);

  function clearState(){ setActive(false); setExList([]); setName("Workout"); startRef.current=null; setElapsed(0); }

  const subtitle = useMemo(()=> active?`Time: ${formatTime(elapsed)}`:"Tap Start to begin",[active,elapsed]);
  const isCardio = (ex:Exercise) => (ex.muscleGroup||"").toLowerCase()==="cardio";
  const newDefaultSet = (ex:Exercise):SetRowVM => isCardio(ex)? {id:uid(), timeMin:5, distance:0.5}:{id:uid(), weight:20, reps:8};

  function addDefault(ex:Exercise){
    setExList(p=> p.find(e=>e.id===ex.id)? p : [...p,{...ex,sets:[],expanded:true}]);
    LayoutAnimation.easeInEaseOut();
  }
  function toggleExpand(id:string){ LayoutAnimation.easeInEaseOut(); setExList(p=>p.map(e=>e.id===id?{...e,expanded:!e.expanded}:e)); }
  function addSet(id:string){ setExList(p=>p.map(e=>e.id===id?{...e,sets:[...e.sets,newDefaultSet(e)]}:e)); }
  function modSet(exId:string,setId:string,delta:Partial<SetRowVM>){
    setExList(p=>p.map(e=> e.id===exId? {...e,sets:e.sets.map(s=>s.id===setId?{...s,...delta}:s)}:e));
  }
  function removeSet(exId:string,setId:string){ setExList(p=>p.map(e=> e.id===exId? {...e,sets:e.sets.filter(s=>s.id!==setId)}:e)); }
  function removeExercise(exId:string){
    LayoutAnimation.easeInEaseOut();
    setExList(p=> p.filter(e=>e.id!==exId));
  }
  function finishPreview(){
    if(!active) return;
    nav.navigate("WorkoutDetail",{ preview:{
      id:"preview", name, startedAt:Date.now()-elapsed, durationSec:Math.floor(elapsed/1000),
      exercises: exList.map(e=>({id:e.id,name:e.name,muscleGroup:e.muscleGroup,sets:e.sets}))
    }, mode:"preview" });
  }

  // Featured z Template’u albo fallback
  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTplId) || null,
    [templates, selectedTplId]
  );

  const featuredFromTemplate: Exercise[] = useMemo(() => {
    if (!selectedTemplate) return [];
    // mapuj ID -> Exercise (z defaultów); jeśli nie znajdzie (np. custom), pokaż dopiero po Search / Add Custom w trakcie
    const map = new Map(DEFAULT_EXERCISES.map(e => [e.id, e]));
    return selectedTemplate.exerciseIds
      .map(id => map.get(id))
      .filter(Boolean) as Exercise[];
  }, [selectedTemplate]);

  const fallbackFeatured: Exercise[] = useMemo(() => {
    const byId = new Map(DEFAULT_EXERCISES.map(e => [e.id, e]));
    return FEATURED_DEFAULT_IDS.map(id => byId.get(id)).filter(Boolean) as Exercise[];
  }, []);

  const visibleFeatured = useMemo(
    () => (featuredFromTemplate.length ? featuredFromTemplate : fallbackFeatured)
      .filter(d => !exList.some(e => e.id === d.id)),
    [featuredFromTemplate, fallbackFeatured, exList]
  );

  async function onPickTemplate(t: Template | "create") {
    if (t === "create") {
      nav.navigate("TemplateEditor" as never);
      return;
    }
    setSelectedTplId(t.id);
    await setSelectedTemplateId(t.id);
    LayoutAnimation.easeInEaseOut();
  }

  // UI kart Template’ów (siatka)
  function TemplateCard({ t, active }: { t: Template; active: boolean }) {
    return (
      <TouchableOpacity onPress={() => onPickTemplate(t)} style={[st.tplCard, active && st.tplCardActive]}>
        <View style={st.tplIconWrap}>
          <Ionicons name={TEMPLATE_ICON_MAP[t.icon]} size={22} color={active ? "#0E0E10" : colors.text} />
        </View>
        <Text style={[st.tplName, active && { color: "#0E0E10" }]} numberOfLines={1}>{t.name}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.container}>
        <View style={st.header}>
          <View>
            <Text style={st.title}>{name}</Text>
            <Text style={st.subtitle}>{subtitle}</Text>
          </View>
          {active && (
            <TouchableOpacity style={[st.pillButton,{backgroundColor:"#2E3136"}]} onPress={clearState}>
              <Ionicons name="close" size={18} color={colors.text}/><Text style={st.pillText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {!active ? (
          <ScrollView contentContainerStyle={{ paddingBottom: spacing(4) }}>
            {/* GRID TEMPLATES */}
            <Text style={st.sectionTitle}>Templates</Text>
            <View style={st.tplGrid}>
              {templates.map((t) => (
                <TemplateCard key={t.id} t={t} active={t.id === selectedTplId} />
              ))}
              {/* + create */}
              <TouchableOpacity onPress={() => onPickTemplate("create")} style={[st.tplCard, st.tplCreate]}>
                <View style={st.tplIconWrap}>
                  <Ionicons name="add" size={22} color={colors.text} />
                </View>
                <Text style={st.tplName}>Custom</Text>
              </TouchableOpacity>
            </View>

            {/* START */}
            <TouchableOpacity style={[st.cta,{marginTop:spacing(2)}]} onPress={()=>setActive(true)}>
              <Text style={st.ctaText}>Start workout</Text>
            </TouchableOpacity>
          </ScrollView>
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
                              <NumCounter
                                label="kg"
                                mode="float"
                                maxDigits={4}
                                value={s.weight ?? 20}
                                onMinus={() => modSet(item.id,s.id,{weight:Math.max(0,(s.weight??20)-2.5)})}
                                onPlus={() => modSet(item.id,s.id,{weight:(s.weight??20)+2.5})}
                                onType={(v)=>modSet(item.id,s.id,{weight:v})}
                              />
                              <NumCounter
                                label="reps"
                                mode="int"
                                maxDigits={4}
                                value={s.reps ?? 8}
                                onMinus={() => modSet(item.id,s.id,{reps:Math.max(0,(s.reps??8)-1)})}
                                onPlus={() => modSet(item.id,s.id,{reps:(s.reps??8)+1})}
                                onType={(v)=>modSet(item.id,s.id,{reps:Math.max(0, Math.floor(v))})}
                              />
                            </>
                          ) : (
                            <>
                              <NumCounter
                                label="km"
                                value={s.distance ?? 0.5}
                                onMinus={() => modSet(item.id,s.id,{distance:Math.max(0, round1((s.distance??0.5)-0.1))})}
                                onPlus={() => modSet(item.id,s.id,{distance:round1((s.distance??0.5)+0.1)})}
                                onType={(v)=>modSet(item.id,s.id,{distance:v})}
                              />
                              <NumCounter
                                label="min"
                                value={s.timeMin ?? 5}
                                onMinus={() => modSet(item.id,s.id,{timeMin:Math.max(0,(s.timeMin??5)-1)})}
                                onPlus={() => modSet(item.id,s.id,{timeMin:(s.timeMin??5)+1})}
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
              <TouchableOpacity style={[st.cta,{backgroundColor:colors.accent,marginTop:spacing(2)}]} onPress={finishPreview}>
                <Text style={[st.ctaText,{color:"#0E0E10"}]}>Finish</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

function NumCounter({
  label,
  value,
  onMinus,
  onPlus,
  onType,
  mode = "float",
  maxDigits = 4,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  onType: (v: number) => void;
  mode?: "int" | "float";
  maxDigits?: number;
}) {
  const [text, setText] = React.useState(String(value ?? ""));

  React.useEffect(() => {
    const asText = text === "" ? "" : String(value ?? "");
    if (asText !== text) setText(asText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function applyLimitAndSet(t: string) {
    if (t === "") { setText(""); return; }
    t = t.replace(",", ".");

    if (mode === "int") {
      t = t.replace(/\D+/g, "");
    } else {
      t = t.replace(/[^0-9.]/g, "");
      const parts = t.split(".");
      if (parts.length > 2) t = parts[0] + "." + parts.slice(1).join("");
    }

    const [intPart, fracPart = ""] = t.split(".");
    const limitedInt = intPart.slice(0, maxDigits);
    t = mode === "float" ? (fracPart !== "" ? `${limitedInt}.${fracPart}` : limitedInt) : limitedInt;

    setText(t);
  }

  function commitIfNeeded() {
    if (text === "") return;
    const num = Number(text);
    if (!Number.isNaN(num)) onType(num);
  }

  return (
    <View style={st.counter}>
      <TouchableOpacity onPress={onMinus} style={st.counterBtn}>
        <Ionicons name="remove" size={16} color={colors.text} />
      </TouchableOpacity>

      <TextInput
        style={st.counterInput}
        value={text}
        keyboardType="numeric"
        inputMode="decimal"
        onChangeText={applyLimitAndSet}
        onBlur={() => {
          if (text === "") { setText("0"); onType(0); return; }
          commitIfNeeded();
        }}
        returnKeyType="done"
        blurOnSubmit
      />

      <TouchableOpacity onPress={onPlus} style={st.counterBtn}>
        <Ionicons name="add" size={16} color={colors.text} />
      </TouchableOpacity>

      <Text style={st.counterLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function formatTime(ms:number){const s=Math.floor(ms/1000);const m=Math.floor(s/60);const r=s%60;return `${m}:${r.toString().padStart(2,"0")}`;}
function round1(n:number){return Math.round(n*10)/10;}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},
  container:{flex:1,paddingHorizontal:spacing(2)},
  header:{paddingVertical:spacing(2),flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  title:{color:colors.text,fontSize:24,fontWeight:"700"},
  subtitle:{color:colors.subtext,marginTop:4},

  // Templates
  sectionTitle:{color:colors.text,fontSize:16,fontWeight:"600",marginBottom:spacing(1)},
  tplGrid:{flexDirection:"row",flexWrap:"wrap",gap:12},
  tplCard:{
    width:"47%",
    backgroundColor:colors.card,
    borderRadius:16,
    padding:spacing(2),
    borderWidth:1,
    borderColor:colors.border,
  },
  tplCardActive:{ borderColor: colors.accent, backgroundColor: "#1d1f23" },
  tplIconWrap:{width:44,height:44,borderRadius:12,alignItems:"center",justifyContent:"center",backgroundColor:colors.muted,marginBottom:10},
  tplName:{color:colors.text,fontWeight:"700"},
  tplCreate:{borderStyle:"dashed"},

  bottomArea:{paddingBottom:spacing(2)},
  cta:{backgroundColor:colors.card,paddingVertical:spacing(2),alignItems:"center",borderRadius:14,...shadow},
  ctaText:{color:colors.text,fontSize:16,fontWeight:"700"},

  bottomDock:{backgroundColor:colors.bg,paddingTop:spacing(2),paddingHorizontal:spacing(2),paddingBottom:spacing(2),borderTopWidth:1,borderTopColor:colors.border},
  quickHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:spacing(1)},
  chipsRow:{flexDirection:"row",flexWrap:"wrap",gap:8},
  chip:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:colors.muted,paddingVertical:8,paddingHorizontal:12,borderRadius:12,marginRight:8,marginBottom:8},
  chipText:{color:colors.text,fontSize:13},
  searchChip:{backgroundColor:"#2A2D33"},

  exerciseCard:{backgroundColor:colors.card,borderRadius:14,padding:spacing(2),marginBottom:spacing(1.5),borderWidth:1,borderColor:colors.border},
  exerciseHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  iconBadge:{backgroundColor:colors.muted,width:28,height:28,borderRadius:8,alignItems:"center",justifyContent:"center"},
  exerciseName:{color:colors.text,fontSize:16,fontWeight:"600"},
  setHint:{color:colors.subtext,fontSize:12},
  pillButton:{flexDirection:"row",alignItems:"center",gap:6,paddingVertical:8,paddingHorizontal:12,borderRadius:999},
  pillText:{color:colors.text,fontWeight:"600"},

  setRow:{flexDirection:"row",alignItems:"center",paddingVertical:8},
  setIndex:{color:colors.subtext,width:16,textAlign:"right",marginRight:6},

  addSetBtn:{flexDirection:"row",gap:6,alignItems:"center",paddingVertical:8},
  addSetTxt:{color:colors.text,fontWeight:"600"},

  // kapsuły flex
  counter:{
    flex:1, minWidth:96, maxWidth:148,
    flexDirection:"row", alignItems:"center",
    backgroundColor:colors.muted, borderRadius:10,
    paddingHorizontal:6, paddingVertical:6, marginRight:6,
  },
  counterBtn:{paddingHorizontal:4,paddingVertical:2},
  counterInput:{
    flexGrow:1, minWidth:32, maxWidth:56,
    color:colors.text, textAlign:"center", fontWeight:"700",
    paddingVertical:0, paddingHorizontal:2,
  },
  counterLabel:{color:colors.subtext, marginLeft:4, fontSize:10, flexShrink:0},
  trashBtn:{marginLeft:8, padding:6},
});