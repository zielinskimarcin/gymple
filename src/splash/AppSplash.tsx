// src/splash/AppSplash.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";

// Prosty, lekki splash z animacją (fade + scale + pulsujące kropki)
export const AppSplash: React.FC<{ onComplete?: () => void; durationMs?: number }> = ({
  onComplete,
  durationMs = 1800,
}) => {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
    ]).start();

    // pętla „oddychających” kropek
    const makeLoop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 450, delay, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ])
      );
    const l1 = makeLoop(dot1, 0);
    const l2 = makeLoop(dot2, 150);
    const l3 = makeLoop(dot3, 300);
    l1.start(); l2.start(); l3.start();

    const t = setTimeout(() => onComplete?.(), durationMs);
    return () => { clearTimeout(t); l1.stop(); l2.stop(); l3.stop(); };
  }, [onComplete, durationMs, fade, scale, dot1, dot2, dot3]);

  const dotStyle = (v: Animated.Value) => ({
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
  });

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.center, { opacity: fade, transform: [{ scale }] }]}>
        {/* „Kafelek” z ikoną – bez dodatkowych zależności (minimalistyczny gradient-emulacja dwoma warstwami) */}
        <View style={s.logoTileOuter}>
          <View style={s.logoTileInner}/>
          <Ionicons name="barbell" size={56} color="#fff" style={{ position: "absolute" }} />
        </View>

        <View style={{ alignItems: "center", marginTop: spacing(2) }}>
          <Text style={s.title}>GymTrack</Text>
          <Text style={s.caption}>Track your progress</Text>
        </View>

        <View style={s.dotsRow}>
          <Animated.View style={[s.dot, dotStyle(dot1)]} />
          <Animated.View style={[s.dot, dotStyle(dot2)]} />
          <Animated.View style={[s.dot, dotStyle(dot3)]} />
        </View>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#000", // wpasuje się w dark theme
    alignItems: "center",
    justifyContent: "center",
  },
  center: { alignItems: "center", justifyContent: "center" },

  logoTileOuter: {
    width: 112, height: 112, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    // pseudo-gradient: lekki cień + tło w stronę „pomarańcz-czerwony”
    backgroundColor: "#E6452E",
    shadowColor: "#E6452E",
    shadowOpacity: Platform.OS === "ios" ? 0.45 : 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  logoTileInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    backgroundColor: "#FF7A33",
    opacity: 0.55,
  },

  title: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: 0.5 },
  caption: { color: "#8b8b8b", marginTop: 4 },

  dotsRow: { flexDirection: "row", gap: 8, marginTop: spacing(4) },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#FF7A33",
  },
});