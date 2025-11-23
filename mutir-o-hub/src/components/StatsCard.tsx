import { ReactNode } from 'react';
import { Card, CardContent } from './ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Purpose: Reusable stats card component for displaying KPIs
// Shows value, label, trend, and optional icon

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down';
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  changeLabel = 'vs yesterday',
  icon,
  trend 
}: StatsCardProps) {
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  
  return (
    <Card className="stats-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="text-sm font-medium text-muted-foreground">
            {title}
          </div>
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="text-3xl font-bold text-foreground">
            {value}
          </div>
          
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
              {trend === 'up' && <ArrowUp className="w-4 h-4" />}
              {trend === 'down' && <ArrowDown className="w-4 h-4" />}
              <span>{change > 0 ? '+' : ''}{change}%</span>
              <span className="text-muted-foreground ml-1">{changeLabel}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
