import { Search, Bell, MessageSquare, HelpCircle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';

interface TopBarProps {
  onCopilotToggle?: () => void;
  copilotOpen?: boolean;
}

export const TopBar = ({ onCopilotToggle, copilotOpen }: TopBarProps) => {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates, pipelines, campaigns..."
              className="pl-10 bg-background border-border font-body"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* AI Copilot Button - Prominent */}
          <Button 
            onClick={onCopilotToggle}
            className={`
              flex items-center gap-2 px-4 py-2 font-medium transition-all duration-200
              ${copilotOpen 
                ? 'bg-sunrise text-neutral-charcoal hover:bg-sunrise/90' 
                : 'bg-gradient-to-r from-sunrise to-sky-blue text-white hover:opacity-90'
              }
            `}
          >
            <Brain className="w-5 h-5" />
            <span className="hidden sm:inline">AI Copilot</span>
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground relative">
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-sunrise rounded-full"></span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
