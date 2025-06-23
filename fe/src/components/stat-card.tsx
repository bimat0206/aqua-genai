
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass = 'text-accent-gradient-from', description }) => {
  return (
    <Card className="bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("w-6 h-6", colorClass)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-4xl font-bold", colorClass)}>{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

export default StatCard;
