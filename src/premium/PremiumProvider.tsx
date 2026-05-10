import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { PaywallOverlay } from "./PaywallOverlay";

type PremiumCtx = {
  isPremium: boolean;
  /** Gdy przekroczony limit – zwraca false i OTWIERA paywall. */
  checkSaveLimit(): Promise<boolean>;
  /** Ręczne otwarcie paywalla (np. z ustawień). */
  openPaywall(): void;
};

const PremiumContext = createContext<PremiumCtx>({
  isPremium: false,
  checkSaveLimit: async () => true,
  openPaywall: () => {},
});

export const usePremium = () => useContext(PremiumContext);

async function countFinishedWorkouts(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "finished");

  if (error) {
    console.warn("[Premium] countFinishedWorkouts:", error.message);
    // fail-safe: pozwól zapisać, aby nie tracić danych przy błędzie liczenia
    return 0;
  }
  return count ?? 0;
}

export const PremiumProvider: React.FC<{ children: React.ReactNode; freeLimit: number }> = ({
  children,
  freeLimit,
}) => {
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  // Na potrzeby testów: ZAWSZE false (nie ma Premium).
  const [isPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const checkSaveLimit = useCallback(async () => {
    if (!userId) return false; // bez zalogowania – blokuj
    if (isPremium) return true;

    const finished = await countFinishedWorkouts(userId);
    const allowed = finished < freeLimit;
    if (!allowed) {
      setShowPaywall(true); // pokaż paywall i NIE przepuszczaj zapisu
    }
    return allowed;
  }, [userId, isPremium, freeLimit]);

  const openPaywall = useCallback(() => setShowPaywall(true), []);

  // 🛑 Przyciski paywalla NIC NIE ROBIĄ (zostaje otwarty)
  const handlePurchaseNoop = () => {};
  const handleCloseNoop = () => {};

  const value = useMemo<PremiumCtx>(
    () => ({ isPremium, checkSaveLimit, openPaywall }),
    [isPremium, checkSaveLimit, openPaywall]
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <PaywallOverlay
        visible={showPaywall}
        onClose={handleCloseNoop}
        onPurchase={handlePurchaseNoop}
        freeLimit={freeLimit}
      />
    </PremiumContext.Provider>
  );
};