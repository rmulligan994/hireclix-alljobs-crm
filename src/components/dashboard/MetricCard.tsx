import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'accent';
}

export const MetricCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  variant = 'default' 
}: MetricCardProps) => {
  const getCardStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-primary text-white border-none';
      case 'accent':
        return 'bg-gradient-accent text-neutral-charcoal border-none';
      default:
        return 'bg-card text-card-foreground border-border';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'primary':
        return 'text-white/80';
      case 'accent':
        return 'text-neutral-charcoal/80';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTrendColor = () => {
    if (variant === 'primary' || variant === 'accent') {
      return trend === 'up' ? 'text-white/90' : 'text-white/70';
    }
    return trend === 'up' ? 'text-primary' : 'text-destructive';
  };

  return (
    <Card className={`p-6 shadow-card hover:shadow-hover transition-all duration-200 ${getCardStyles()}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`font-body text-sm font-medium mb-2 ${
            variant === 'default' ? 'text-muted-foreground' : 'text-current opacity-80'
          }`}>
            {title}
          </p>
          <div className="space-y-1">
            <h3 className="font-heading text-2xl font-bold">
              {value}
            </h3>
            <p className={`font-body text-sm ${getTrendColor()}`}>
              {trend === 'up' ? '↗' : '↘'} {change} this month
            </p>
          </div>
        </div>
        
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          ${variant === 'default' ? 'bg-muted' : 'bg-white/10'}
        `}>
          <Icon className={`w-6 h-6 ${getIconStyles()}`} />
        </div>
      </div>
    </Card>
  );
};