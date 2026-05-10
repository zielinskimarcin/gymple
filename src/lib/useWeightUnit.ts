import { useEffect, useState } from "react";
import { getWeightUnit, type WeightUnit } from "./units";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";

export function useWeightUnit() {
  const [unit, setUnit] = useState<WeightUnit>("kg");

  useEffect(() => {
    (async () => {
      const u = await getWeightUnit();
      setUnit(u);
    })();
  }, []);

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

  return unit;
}
