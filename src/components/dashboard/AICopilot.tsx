import { useState } from 'react';
import { Brain, ChevronRight, X, Lightbulb, Users, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AICopilotProps {
  collapsed: boolean;
  onToggle: () => void;
}

const suggestions = [
  {
    id: 1,
    type: 'insight',
    icon: Lightbulb,
    title: 'Pipeline Optimization',
    description: 'Your "Engaged" to "Qualified" conversion rate is 51%. Consider sending follow-up messages to 12 candidates.',
    action: 'View Candidates'
  },
  {
    id: 2,
    type: 'outreach',
    icon: Mail,
    title: 'Campaign Opportunity',
    description: 'Found 23 JavaScript developers who match your Senior Engineer role. Create a targeted outreach campaign?',
    action: 'Create Campaign'
  },
  {
    id: 3,
    type: 'talent',
    icon: Users,
    title: 'Similar Candidates',
    description: 'Based on your recent hires, we found 15 candidates with similar profiles currently in your pipeline.',
    action: 'Review Matches'
  }
];

export const AICopilot = ({ collapsed, onToggle }: AICopilotProps) => {
  return (
    <div className={`
      bg-neutral-white border-l border-border transition-all duration-300 ease-in-out
      ${collapsed ? 'w-0 overflow-hidden' : 'w-80'}
      h-screen flex flex-col
    `}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-heading font-semibold text-neutral-charcoal">
              AI Copilot
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-neutral-charcoal hover:bg-neutral-light"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="text-xs font-body text-neutral-mid mb-4">
          AI RECOMMENDATIONS
        </div>
        
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <Card key={suggestion.id} className="p-4 bg-neutral-light border-neutral-mid/20 hover:shadow-hover transition-all duration-200">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-sky-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-sky-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-body font-medium text-sm text-neutral-charcoal mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="font-body text-xs text-neutral-mid mb-3 leading-relaxed">
                    {suggestion.description}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full justify-between text-xs border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                  >
                    {suggestion.action}
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="font-body text-xs text-neutral-mid text-center">
          AI suggestions require your approval before execution
        </p>
      </div>
    </div>
  );
};