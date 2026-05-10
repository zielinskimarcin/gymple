import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { PaywallOverlay } from "./PaywallOverlay";
import Purchases, { CustomerInfo } from "react-native-purchases";
import { configureRevenueCat, isRevenueCatReady } from "./revenuecat";

type PremiumCtx = {
  isPremium: boolean;
  checkSaveLimit(): Promise<boolean>;
  openPaywall(options?: { source?: PaywallSource }): void;
  refreshPremium(): Promise<void>;
};

type PaywallSource = "limit" | "upgrade";

const PremiumContext = createContext<PremiumCtx>({
  isPremium: false,
  checkSaveLimit: async () => true,
  openPaywall: () => {},
  refreshPremium: async () => {},
});

export const usePremium = () => useContext(PremiumContext);

const ENTITLEMENT_ID = "premium";

async function countFinishedWorkouts(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "finished");

  if (error) return 0;
  return count ?? 0;
}

function hasEntitlement(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return Boolean(info.entitlements?.active?.[ENTITLEMENT_ID]);
}

export const PremiumProvider: React.FC<{
  children: React.ReactNode;
  freeLimit: number;
}> = ({ children, freeLimit }) => {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallSource, setPaywallSource] = useState<PaywallSource>("upgrade");

  const pendingResolveRef = useRef<((v: boolean) => void) | null>(null);
  const pendingPromiseRef = useRef<Promise<boolean> | null>(null);

  const clearPending = useCallback(() => {
    pendingResolveRef.current = null;
    pendingPromiseRef.current = null;
  }, []);

  const resolvePending = useCallback(
    (value: boolean) => {
      const r = pendingResolveRef.current;
      if (r) r(value);
      clearPending();
    },
    [clearPending]
  );

  const refreshPremium = useCallback(async () => {
    if (!(await isRevenueCatReady())) {
      setIsPremium(false);
      return;
    }
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPremium(hasEntitlement(info));
    } catch {
      setIsPremium(false);
    }
  }, []);

  useEffect(() => {
    if (!configureRevenueCat()) return;

    const listener = (info: CustomerInfo) => {
      const active = hasEntitlement(info);
      setIsPremium(active);

      if (active && pendingResolveRef.current) {
        resolvePending(true);
        setShowPaywall(false);
      }
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    refreshPremium();
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [refreshPremium, resolvePending]);

  useEffect(() => {
    refreshPremium();
  }, [userId, refreshPremium]);

  const checkSaveLimit = useCallback(async () => {
    if (!userId) return false;

    if (isPremium) return true;

    const finished = await countFinishedWorkouts(userId);
    const overLimit = finished >= freeLimit;

    if (!overLimit) return true;

    if (pendingPromiseRef.current) return pendingPromiseRef.current;

    setPaywallSource("limit");
    setShowPaywall(true);

    const p = new Promise<boolean>((resolve) => {
      pendingResolveRef.current = resolve;
    });

    pendingPromiseRef.current = p;
    return p;
  }, [userId, isPremium, freeLimit]);

  const openPaywall = useCallback((options?: { source?: PaywallSource }) => {
    setPaywallSource(options?.source ?? "upgrade");
    setShowPaywall(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowPaywall(false);
    if (pendingResolveRef.current) resolvePending(false);
  }, [resolvePending]);

  const handleUnlock = useCallback(async () => {
    if (await isRevenueCatReady()) {
      try {
        const info = await Purchases.getCustomerInfo();
        const active = hasEntitlement(info);
        setIsPremium(active);
        if (pendingResolveRef.current) resolvePending(active);
      } catch {
        if (pendingResolveRef.current) resolvePending(false);
      }
    } else {
      if (pendingResolveRef.current) resolvePending(false);
    }

    setShowPaywall(false);
  }, [resolvePending]);

  const value = useMemo(
    () => ({ isPremium, checkSaveLimit, openPaywall, refreshPremium }),
    [isPremium, checkSaveLimit, openPaywall, refreshPremium]
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <PaywallOverlay
        visible={showPaywall}
        source={paywallSource}
        onClose={handleClose}
        onUnlock={handleUnlock}
      />
    </PremiumContext.Provider>
  );
};

export default PremiumProvider;
