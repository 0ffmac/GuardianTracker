"use client";

import { useEffect, useMemo, useState } from "react";

export type TrustedDeviceKey = {
  kind: "wifi" | "ble";
  key: string;
};

type StoredTrustedDevices = {
  wifi?: string[];
  ble?: string[];
};

const STORAGE_KEY = "guardian-trusted-devices";

export function useTrustedDevices() {
  const [trustedWifiKeys, setTrustedWifiKeys] = useState<string[]>([]);
  const [trustedBleKeys, setTrustedBleKeys] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredTrustedDevices;
      if (Array.isArray(parsed.wifi)) {
        setTrustedWifiKeys(parsed.wifi);
      }
      if (Array.isArray(parsed.ble)) {
        setTrustedBleKeys(parsed.ble);
      }
    } catch (err) {
      console.error("Failed to load trusted devices from storage", err);
    }
  }, []);

  const trustedWifiKeySet = useMemo(() => new Set(trustedWifiKeys), [trustedWifiKeys]);
  const trustedBleKeySet = useMemo(() => new Set(trustedBleKeys), [trustedBleKeys]);

  const persist = (wifi: string[], ble: string[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ wifi, ble })
      );
    } catch (err) {
      console.error("Failed to persist trusted devices", err);
    }
  };

  const toggleTrusted = (device: TrustedDeviceKey, nextValue?: boolean) => {
    if (device.kind === "wifi") {
      setTrustedWifiKeys((prev) => {
        const set = new Set(prev);
        const target = nextValue ?? !set.has(device.key);
        if (target) set.add(device.key);
        else set.delete(device.key);
        const next = Array.from(set);
        persist(next, trustedBleKeys);
        return next;
      });
    } else {
      setTrustedBleKeys((prev) => {
        const set = new Set(prev);
        const target = nextValue ?? !set.has(device.key);
        if (target) set.add(device.key);
        else set.delete(device.key);
        const next = Array.from(set);
        persist(trustedWifiKeys, next);
        return next;
      });
    }
  };

  const isTrusted = (device: TrustedDeviceKey) => {
    if (device.kind === "wifi") {
      return trustedWifiKeySet.has(device.key);
    }
    return trustedBleKeySet.has(device.key);
  };

  return {
    trustedWifiKeySet,
    trustedBleKeySet,
    toggleTrusted,
    isTrusted,
  };
}
