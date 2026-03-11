"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getLeadUsageStatus, getLeadUsageTooltip, type LeadUsageStatus } from "@/utils/leadUsage";

export type { LeadUsageStatus } from "@/utils/leadUsage";
export { getLeadUsageStatus } from "@/utils/leadUsage";

const dotStyles: Record<LeadUsageStatus, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-500",
  green: "bg-emerald-500",
};

interface LeadUsageIndicatorProps {
  lastActivityAt: Date | null;
  className?: string;
  showTooltip?: boolean;
}

export function LeadUsageIndicator({
  lastActivityAt,
  className,
  showTooltip = true,
}: LeadUsageIndicatorProps) {
  const status = getLeadUsageStatus(lastActivityAt);
  const tooltipLabel = getLeadUsageTooltip(status);

  const dot = (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        dotStyles[status],
        className
      )}
      role="status"
      aria-label={tooltipLabel}
    />
  );

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{dot}</TooltipTrigger>
        <TooltipContent>{tooltipLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return dot;
}
