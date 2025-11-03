import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { colors, spacing } from "../theme";
import { useAuth } from "./AuthProvider";

export const SignInScreen = ({ navigation }: any) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true); setErr(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr(error);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{flex:1, backgroundColor: colors.bg}}>
      <View style={s.container}>
        <Text style={s.title}>Welcome</Text>
        <Text style={s.sub}>Sign in to continue</Text>

        <TextInput placeholder="Email" placeholderTextColor={colors.subtext} autoCapitalize="none"
          keyboardType="email-address" style={s.input} value={email} onChangeText={setEmail}/>
        <TextInput placeholder="Password" placeholderTextColor={colors.subtext} secureTextEntry
          style={s.input} value={password} onChangeText={setPassword}/>
        {err ? <Text style={s.err}>{err}</Text> : null}

        <TouchableOpacity style={s.cta} onPress={onSubmit} disabled={busy}>
          <Text style={s.ctaTxt}>{busy ? "Signing in..." : "Sign in"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={()=>navigation.navigate("SignUp")} style={{marginTop:12, alignSelf:"center"}}>
          <Text style={{color:colors.subtext}}>No account? <Text style={{color:colors.accent,fontWeight:"700"}}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export const SignUpScreen = ({ navigation }: any) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true); setErr(null); setOk(false);
    const { error } = await signUp(email.trim(), password);
    setBusy(false);
    if (error) setErr(error); else setOk(true);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{flex:1, backgroundColor: colors.bg}}>
      <View style={s.container}>
        <Text style={s.title}>Create account</Text>
        <Text style={s.sub}>Use your email</Text>

        <TextInput placeholder="Email" placeholderTextColor={colors.subtext} autoCapitalize="none"
          keyboardType="email-address" style={s.input} value={email} onChangeText={setEmail}/>
        <TextInput placeholder="Password" placeholderTextColor={colors.subtext} secureTextEntry
          style={s.input} value={password} onChangeText={setPassword}/>
        {err ? <Text style={s.err}>{err}</Text> : null}
        {ok ? <Text style={{color:colors.subtext, alignSelf:"center", marginBottom:8}}>Check your email if confirmation is on.</Text> : null}

        <TouchableOpacity style={s.cta} onPress={onSubmit} disabled={busy}>
          <Text style={s.ctaTxt}>{busy ? "Signing up..." : "Sign up"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={()=>navigation.goBack()} style={{marginTop:12, alignSelf:"center"}}>
          <Text style={{color:colors.subtext}}>Have an account? <Text style={{color:colors.accent,fontWeight:"700"}}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container:{ flex:1, padding: spacing(2), justifyContent:"center" },
  title:{ color:colors.text, fontSize:28, fontWeight:"800", textAlign:"center" },
  sub:{ color:colors.subtext, textAlign:"center", marginBottom: spacing(2) },
  input:{ backgroundColor:colors.card, color:colors.text, borderRadius:12, padding:12, borderWidth:1, borderColor:colors.border, marginBottom:10 },
  cta:{ backgroundColor:colors.accent, borderRadius:14, alignItems:"center", paddingVertical: spacing(2) },
  ctaTxt:{ color:"#0E0E10", fontWeight:"800" },
  err:{ color:"#ff6b6b", textAlign:"center", marginBottom:8 },
});