"use client";

import React from "react";

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
            known
          </span>
          {trustedSourceLabel && (
            <span className="text-[10px] text-emerald-200">
              {trustedSourceLabel}
            </span>
          )}
          <span className="ml-1 text-[9px] text-gray-400 underline">
            mark as untrusted
          </span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-200 border border-red-400/40 mr-1">
            possible tracker
          </span>
          <span className="text-[9px] text-gray-300 underline">mark as known</span>
        </>
      )}
    </button>
  );
}
