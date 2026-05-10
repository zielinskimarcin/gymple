import { useEffect, useState } from "react";
import { getWeightUnit, type WeightUnit } from "./units";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";

/**
 * Hook to get current weight unit ("kg" or "lb").
 * Automatically refreshes when screen regains focus.
 */
export function useWeightUnit() {
  const [unit, setUnit] = useState<WeightUnit>("kg");

  // initial load
  useEffect(() => {
    (async () => {
      const u = await getWeightUnit();
      setUnit(u);
    })();
  }, []);

  // refresh when returning to screen (e.g., after changing in Settings)
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        const u = await getWeightUnit();
        if (alive) setUnit(u);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  return unit; // "kg" | "lb"
}