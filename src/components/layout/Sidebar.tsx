import { useState } from 'react';
import { 
  Home, 
  Users, 
  TrendingUp, 
  Mail, 
  BarChart3, 
  Settings, 
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigationItems = [
  { icon: Home, label: 'Dashboard', path: '/', active: true },
  { icon: Users, label: 'Talent Pool', path: '/talent' },
  { icon: TrendingUp, label: 'Pipelines', path: '/pipelines' },
  { icon: Mail, label: 'Campaigns', path: '/campaigns' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Zap, label: 'Integrations', path: '/integrations' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  return (
    <div className={`
      bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out
      ${collapsed ? 'w-16' : 'w-64'}
      h-screen flex flex-col
    `}>
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-heading font-bold text-lg text-sidebar-foreground">
                Project Beacon
              </h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              className={`
                w-full flex items-center space-x-3 px-3 py-3 rounded-lg
                font-body text-sm transition-all duration-200
                ${item.active 
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-accent rounded-full flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm font-medium text-sidebar-foreground truncate">
                Sarah Chen
              </p>
              <p className="font-body text-xs text-sidebar-foreground/70 truncate">
                Talent Acquisition Lead
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};