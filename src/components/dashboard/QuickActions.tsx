"use client";

import { useRouter } from 'next/navigation';
import { Search, Briefcase, Users, BarChart3, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface QuickAction {
  title: string;
  description: string;
  icon: LucideIcon;
  /** In-app route */
  path?: string;
  /** External URL (opens in a new tab) */
  href?: string;
}

const actions: QuickAction[] = [
  {
    title: 'Search Candidates',
    description: 'Find and discover talent from your database',
    icon: Search,
    path: '/talent',
  },
  {
    title: 'Manage Jobs',
    description: 'track open positions',
    icon: Briefcase,
    path: '/jobs',
  },
  {
    title: 'Talent Pools',
    description: 'Organize candidates into strategic pools',
    icon: Users,
    path: '/talent-pools',
  },
  {
    title: 'Reports',
    description: 'Analytics and recruitment insights',
    icon: BarChart3,
    href: 'https://dashboard.hireclix.com/client/dist/#/login',
  },
];

export const QuickActions = () => {
  const router = useRouter();

  return (
    <div className="mb-8">
      <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.title}
              onClick={() => {
                if (action.href) {
                  window.open(action.href, '_blank', 'noopener,noreferrer');
                } else if (action.path) {
                  router.push(action.path);
                }
              }}
              className="p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-sky-blue/50 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-sky-blue/10 flex items-center justify-center mb-4 group-hover:bg-sky-blue/20 transition-colors">
                  <Icon className="w-7 h-7 text-sky-blue" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">
                  {action.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
