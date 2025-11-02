import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteWorkout, loadWorkouts, saveWorkouts, setCancelDone, setConfirmDone, updateWorkout } from "../storage";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

type SetRow = { id: string; weight?: number; reps?: number; timeMin?: number; distance?: number };
type ExRow = { id: string; name: string; muscleGroup: string; sets: SetRow[] };
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const WorkoutDetailScreen = () => {
  const route = useRoute<any>(); const nav = useNavigation();
  const { workoutId, preview, mode } = route.params || {};
  const isPreview = mode === "preview" && preview;

  const [w,setW] = useState<any|null>(null); const [name,setName]=useState(""); const [editing,setEditing]=useState<Record<string,boolean>>({});

  useEffect(()=>{(async()=>{
    if(isPreview){ setW(preview); setName(preview?.name??""); }
    else { const list=await loadWorkouts(); const found=list.find(x=>x.id===workoutId)||null; setW(found); setName(found?.name??""); }
  })();},[workoutId,isPreview]);

  async function confirmAndExit(){
    if(!w) return;
    if(isPreview){
      const savedId=uid();
      const saved={ id:savedId, name, startedAt:w.startedAt, endedAt:Date.now(), durationSec:w.durationSec, status:"finished" as const, exercises:w.exercises };
      const list=await loadWorkouts(); await saveWorkouts([saved,...list]); await setConfirmDone(savedId); nav.goBack(); return;
    }
    await updateWorkout(w.id,()=>({...w,name})); nav.goBack();
  }
  async function handleDeleteWorkout(){
    if(!w) return;
    if(isPreview){ await setCancelDone(); // @ts-ignore
      nav.navigate("Tabs"); return; }
    await deleteWorkout(w.id); nav.goBack();
  }

  function toggleEditExercise(id:string){ setEditing(e=>({...e,[id]:!e[id]})); }
  function removeExercise(id:string){ if(!w) return; setW({...w,exercises:w.exercises.filter((e:ExRow)=>e.id!==id)}); }
  function addSet(id:string){
    if(!w) return;
    const ex=w.exercises.find((e:ExRow)=>e.id===id);
    const cardio=(ex?.muscleGroup||"").toLowerCase()==="cardio";
    const def = cardio? {id:uid(),timeMin:5,distance:0.5} : {id:uid(),weight:20,reps:8};
    setW({...w,exercises:w.exercises.map((e:ExRow)=> e.id===id? {...e,sets:[...e.sets,def]}:e)});
  }
  function modSet(exId:string,setId:string,delta:Partial<SetRow>){
    if(!w) return; setW({...w,exercises:w.exercises.map((e:ExRow)=> e.id===exId? {...e,sets:e.sets.map(s=> s.id===setId?{...s,...delta}:s)}:e)});
  }
  function removeSet(exId:string,setId:string){
    if(!w) return; setW({...w,exercises:w.exercises.map((e:ExRow)=> e.id===exId? {...e,sets:e.sets.filter(s=>s.id!==setId)}:e)});
  }

  if(!w) return <SafeAreaView style={{flex:1,backgroundColor:colors.bg}}/>;

  return (
    <SafeAreaView style={{flex:1,backgroundColor:colors.bg}}>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{flex:1}}>
        <View style={{flex:1}}>
          <ScrollView style={{flex:1}} contentContainerStyle={{padding:spacing(2),paddingBottom:spacing(18)}}>
            <View style={s.top}>
              <TouchableOpacity onPress={()=>nav.goBack()} style={s.iconBtn}><Ionicons name="chevron-back" size={20} color={colors.text}/></TouchableOpacity>
              <Text style={s.topTitle}>Summary</Text><View style={{width:36}}/>
            </View>

            <View style={s.headerCard}>
              <View style={{flexDirection:"row",alignItems:"center",gap:10}}><Ionicons name="checkmark-circle" size={22} color={colors.accent}/><Text style={{color:colors.text,fontSize:18,fontWeight:"800"}}>{isPreview?"Workout done!":"Workout"}</Text></View>
              <Text style={{color:colors.subtext,marginTop:6}}>{new Date(w.startedAt).toLocaleString()} • {Math.floor(w.durationSec/60)}m {w.durationSec%60}s</Text>
              <Text style={s.label}>Name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Workout" placeholderTextColor={colors.subtext} style={s.input}/>
            </View>

            {w.exercises?.map((e:ExRow)=>{
              const edit=!!editing[e.id]; const cardio=(e.muscleGroup||"").toLowerCase()==="cardio";
              return (
                <View key={e.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <Text style={s.exTitle}>{e.name}</Text>
                    <TouchableOpacity onPress={()=>toggleEditExercise(e.id)}><Ionicons name={edit?"checkmark-done-outline":"create-outline"} size={18} color={colors.subtext}/></TouchableOpacity>
                  </View>

                  {!edit ? (
                    e.sets?.length ? e.sets.map((row:SetRow,i:number)=>(
                      <View key={row.id} style={s.setRow}>
                        <Text style={s.setIndex}>{i+1}</Text>
                        {!cardio ? (
                          <Text style={s.setText}>{(row.weight??0)} kg × {(row.reps??0)}</Text>
                        ) : (
                          <Text style={s.setText}>{(row.distance??0)} km · {(row.timeMin??0)} min</Text>
                        )}
                      </View>
                    )) : <Text style={{color:colors.subtext}}>No sets</Text>
                  ) : (
                    <>
                      {e.sets?.map((row:SetRow,i:number)=>(
                        <View key={row.id} style={s.setRow}>
                          <Text style={s.setIndex}>{i+1}</Text>

                          {!cardio ? (
                            <>
                              <NumCounter
                                label="kg"
                                mode="float"
                                maxDigits={4}
                                value={row.weight ?? 20}
                                onMinus={() => modSet(e.id,row.id,{weight:Math.max(0,(row.weight??20)-2.5)})}
                                onPlus={() => modSet(e.id,row.id,{weight:(row.weight??20)+2.5})}
                                onType={(v)=>modSet(e.id,row.id,{weight:v})}
                              />
                              <NumCounter
                                label="reps"
                                mode="int"
                                maxDigits={4}
                                value={row.reps ?? 8}
                                onMinus={() => modSet(e.id,row.id,{reps:Math.max(0,(row.reps??8)-1)})}
                                onPlus={() => modSet(e.id,row.id,{reps:(row.reps??8)+1})}
                                onType={(v)=>modSet(e.id,row.id,{reps:Math.max(0, Math.floor(v))})}
                              />
                            </>
                          ) : (
                            <>
                              <NumCounter
                                label="km"
                                value={row.distance ?? 0.5}
                                onMinus={() => modSet(e.id,row.id,{distance:Math.max(0,round1((row.distance??0.5)-0.1))})}
                                onPlus={() => modSet(e.id,row.id,{distance:round1((row.distance??0.5)+0.1)})}
                                onType={(v)=>modSet(e.id,row.id,{distance:v})}
                              />
                              <NumCounter
                                label="min"
                                value={row.timeMin ?? 5}
                                onMinus={() => modSet(e.id,row.id,{timeMin:Math.max(0,(row.timeMin??5)-1)})}
                                onPlus={() => modSet(e.id,row.id,{timeMin:(row.timeMin??5)+1})}
                                onType={(v)=>modSet(e.id,row.id,{timeMin:v})}
                              />
                            </>
                          )}

                          <TouchableOpacity onPress={()=>removeSet(e.id,row.id)} style={s.trashBtn}><Ionicons name="trash-outline" size={18} color={colors.subtext}/></TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={s.addSetBtn} onPress={()=>addSet(e.id)}><Ionicons name="add" size={18} color={colors.text}/><Text style={s.addSetTxt}>Add set</Text></TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={s.bottomDock}>
            <TouchableOpacity style={s.confirmBtn} onPress={confirmAndExit}><Text style={s.confirmTxt}>Confirm</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteWorkout} style={{alignSelf:"center",marginTop:8}}><Text style={{color:colors.subtext,textDecorationLine:"underline"}}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    <View style={s.counter}>
      <TouchableOpacity onPress={onMinus} style={s.counterBtn}>
        <Ionicons name="remove" size={16} color={colors.text} />
      </TouchableOpacity>

      <TextInput
        style={s.counterInput}
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

      <TouchableOpacity onPress={onPlus} style={s.counterBtn}>
        <Ionicons name="add" size={16} color={colors.text} />
      </TouchableOpacity>

      <Text style={s.counterLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function round1(n:number){return Math.round(n*10)/10;}

const s = StyleSheet.create({
  top:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:spacing(2)},
  topTitle:{color:colors.text,fontSize:16,fontWeight:"700"},
  iconBtn:{width:36,height:36,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:colors.card,borderWidth:1,borderColor:colors.border},

  headerCard:{backgroundColor:colors.card,borderRadius:14,padding:spacing(2),borderWidth:1,borderColor:colors.border,marginBottom:spacing(1)},
  label:{color:colors.subtext,marginTop:spacing(2),marginBottom:6},
  input:{backgroundColor:colors.muted,color:colors.text,borderRadius:12,padding:12,borderWidth:1,borderColor:colors.border},

  card:{backgroundColor:colors.card,borderRadius:14,padding:spacing(2),borderWidth:1,borderColor:colors.border,marginTop:spacing(1)},
  cardHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:6},
  exTitle:{color:colors.text,fontWeight:"700"},

  setRow:{flexDirection:"row",alignItems:"center",paddingVertical:8},
  setIndex:{color:colors.subtext,width:16,textAlign:"right",marginRight:6},
  setText:{color:colors.text},

  addSetBtn:{flexDirection:"row",gap:6,alignItems:"center",paddingVertical:8},
  addSetTxt:{color:colors.text,fontWeight:"600"},

  bottomDock:{backgroundColor:colors.bg,paddingHorizontal:spacing(2),paddingTop:spacing(2),paddingBottom:spacing(2),borderTopWidth:1,borderTopColor:colors.border},
  confirmBtn:{backgroundColor:colors.accent,borderRadius:14,alignItems:"center",paddingVertical:spacing(2)},
  confirmTxt:{color:"#0E0E10",fontSize:16,fontWeight:"400"},

  // kapsuły flex (jak w Train)
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