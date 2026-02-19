"use client";

import { 
  Home, 
  Users, 
  FolderKanban,
  GitBranch,
  Mail, 
  BarChart3, 
  Settings, 
  Zap,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useSignOut } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigationItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Candidates', path: '/talent' },
  { icon: FolderKanban, label: 'Talent Pools', path: '/talent-pools' },
  { icon: GitBranch, label: 'Pipelines', path: '/pipelines' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },
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
  const pathname = usePathname();
  const { user } = useAuth();
  const signOut = useSignOut();

  const userEmail = user?.email || 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();

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
          const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path + '/'));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                w-full flex items-center space-x-3 px-3 py-3 rounded-lg
                font-body text-sm transition-all duration-200
                ${isActive 
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer with User Menu */}
      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center space-x-3 hover:bg-sidebar-accent/50 rounded-lg p-2 transition-colors">
              <div className="w-8 h-8 bg-gradient-accent rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium text-sm">
                {userInitial}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-body text-sm font-medium text-sidebar-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={() => signOut.mutate()}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};