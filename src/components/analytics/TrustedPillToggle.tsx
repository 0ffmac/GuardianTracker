"use client";

import React from "react";
import { useLanguage } from "@/hooks/useLanguage";

interface TrustedPillToggleProps {
  isTrusted: boolean;
  trustedSourceLabel?: string | null;
  onToggle: () => void;
}

export function TrustedPillToggle({
  isTrusted,
  trustedSourceLabel,
  onToggle,
}: TrustedPillToggleProps) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="inline-flex flex-wrap items-center gap-1"
    >
      {isTrusted ? (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200 border border-emerald-400/40">
            {t("analytics.trusted.known")}
          </span>
          {trustedSourceLabel && (
            <span className="text-[10px] text-emerald-200">{trustedSourceLabel}</span>
          )}
          <span className="ml-1 text-[9px] text-gray-400 underline">
            {t("analytics.trusted.markUntrusted")}
          </span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-200 border border-red-400/40 mr-1">
            {t("analytics.trusted.possibleTracker")}
          </span>
          <span className="text-[9px] text-gray-300 underline">
            {t("analytics.trusted.markKnown")}
          </span>
        </>
      )}
    </button>
  );
}
