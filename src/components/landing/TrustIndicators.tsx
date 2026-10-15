import React from "react";
import { GiftIcon, CardSlashIcon, UserSlashIcon, RepeatIcon } from "@/components/common/Icons";

export default function TrustIndicators() {
  const items = [
    { icon: GiftIcon,      label: "Free" },
    { icon: CardSlashIcon, label: "No card" },
    { icon: UserSlashIcon, label: "No signup" },
    { icon: RepeatIcon,    label: "No subscription" },
  ];

  return (
    <div className="pt-4 border-t border-dashed border-divider">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 text-center">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex flex-col items-center justify-center gap-1.5 group"
            >
              <div className="w-6 h-6 flex items-center justify-center transition-transform group-hover:scale-110 text-brand-green">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-primary">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
