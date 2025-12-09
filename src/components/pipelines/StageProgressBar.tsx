import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StageData {
  name: string;
  count: number;
  color: string;
}

interface StageProgressBarProps {
  stages: { sourced: number; contacted: number; engaged: number; qualified: number; submitted: number; hired: number };
}

const stageConfig: { key: keyof StageProgressBarProps['stages']; name: string; color: string }[] = [
  { key: 'sourced', name: 'Sourced', color: 'bg-muted-foreground/40' },
  { key: 'contacted', name: 'Contacted', color: 'bg-deep-sea' },
  { key: 'engaged', name: 'Engaged', color: 'bg-sky-blue' },
  { key: 'qualified', name: 'Qualified', color: 'bg-sunrise' },
  { key: 'submitted', name: 'Submitted', color: 'bg-orange-500' },
  { key: 'hired', name: 'Hired', color: 'bg-green-500' },
];

export function StageProgressBar({ stages }: StageProgressBarProps) {
  const total = Object.values(stages).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) {
    return (
      <div className="w-full h-6 bg-muted/30 rounded-full overflow-hidden flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No candidates</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full max-w-xs">
      {/* Progress Bar */}
      <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden flex">
        {stageConfig.map(({ key, name, color }) => {
          const count = stages[key];
          const percentage = (count / total) * 100;
          
          if (count === 0) return null;
          
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <div
                  className={`${color} h-full transition-all cursor-pointer hover:opacity-80 flex items-center justify-center`}
                  style={{ width: `${percentage}%`, minWidth: count > 0 ? '8px' : '0' }}
                >
                  {percentage > 10 && (
                    <span className="text-[10px] font-medium text-white drop-shadow-sm">
                      {count}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border">
                <p className="font-medium">{name}</p>
                <p className="text-muted-foreground">{count} candidate{count !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// Badge version with tooltips for compact display
export function StageBadges({ stages }: StageProgressBarProps) {
  return (
    <div className="flex items-center gap-1">
      {stageConfig.map(({ key, name, color }) => {
        const count = stages[key];
        const bgColor = color.replace('bg-', '');
        
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div
                className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-default transition-opacity hover:opacity-80 ${
                  key === 'hired' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-muted/50 text-muted-foreground border border-border'
                }`}
              >
                {name.charAt(0)}: {count}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-card border-border">
              <p className="font-medium">{name}</p>
              <p className="text-muted-foreground">{count} candidate{count !== 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
