import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  size?: number;
  radius?: number;
  badge?: React.ReactNode;
  gradient?: [string, string];
  innerScale?: number;
  offset?: { x?: number; y?: number };
  shadowStrength?: number;
  highlightStrength?: number;
};

export const AppLogo: React.FC<Props> = ({
  size = 72,
  radius,
  badge,
  gradient = ["#ff7a18", "#e52e71"],
  innerScale = 1.08,
  offset = { x: 5, y: 4 },
  shadowStrength = 0.55,
  highlightStrength = 0.18,
}) => {
  const r = radius ?? Math.round(size * 0.28);
  const imgW = size * innerScale;
  const imgH = size * innerScale;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, { width: size, height: size, borderRadius: r }]}
      >
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.0)",
            `rgba(0,0,0,${Math.min(0.35, shadowStrength * 0.35)})`,
            `rgba(0,0,0,${Math.min(0.55, shadowStrength)})`,
          ]}
          locations={[0.52, 0.82, 1]}
          start={{ x: 0.30, y: 0.10 }}
          end={{ x: 1.10, y: 1.15 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: r }]}
        />

        <LinearGradient
          colors={[
            `rgba(255,255,255,${Math.min(0.22, highlightStrength)})`,
            "rgba(255,255,255,0.0)",
          ]}
          locations={[0, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 0.5 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: r }]}
        />

        <Image
          source={require("../../assets/biceps1.png")}
          style={{
            width: imgW,
            height: imgH,
            resizeMode: "contain",
            transform: [
              { translateX: offset.x ?? 0 },
              { translateY: offset.y ?? 0 },
            ],
          }}
        />

        {badge ? <View style={styles.badge}>{badge}</View> : null}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff7a18",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    right: -2,
    top: -2,
  },
});

export default AppLogo;
