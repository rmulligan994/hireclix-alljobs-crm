import { useState } from 'react';
import { Brain, ChevronRight, X, Lightbulb, Users, Mail, Send, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AICopilotProps {
  open: boolean;
  onClose: () => void;
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

const exampleQueries = [
  "Find candidates with React experience",
  "Draft an email to Sarah Johnson",
  "Show me pipeline stats"
];

export const AICopilot = ({ open, onClose }: AICopilotProps) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setQuery('');
    }, 1500);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={`
        fixed top-0 right-0 h-full z-50
        bg-card border-l border-border
        transform transition-transform duration-300 ease-in-out
        w-full sm:w-[400px]
        ${open ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col shadow-2xl
      `}>
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sunrise to-sky-blue rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-foreground text-lg">
                  AI Copilot
                </h2>
                <p className="text-xs text-muted-foreground">Your recruiting assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Query Input */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything about your candidates, pipelines, or campaigns..."
                className="pr-12 bg-background border-border font-body text-sm py-6"
                disabled={isProcessing}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!query.trim() || isProcessing}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-sky-blue hover:bg-sky-blue/90 text-white h-8 w-8 p-0"
              >
                {isProcessing ? (
                  <Sparkles className="w-4 h-4 animate-pulse" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Example Queries */}
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-sky-blue/20 hover:text-sky-blue transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              AI Recommendations
            </span>
            <span className="text-xs text-sky-blue font-medium">3 new</span>
          </div>
          
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <Card 
                key={suggestion.id} 
                className="p-4 bg-muted/50 border-border hover:bg-muted hover:border-sky-blue/30 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-sky-blue/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-sky-blue/20 transition-colors">
                    <Icon className="w-5 h-5 text-sky-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-body font-semibold text-sm text-foreground mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="font-body text-xs text-muted-foreground mb-3 leading-relaxed">
                      {suggestion.description}
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full justify-between text-xs border-sky-blue/50 text-sky-blue hover:bg-sky-blue hover:text-white hover:border-sky-blue"
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
        <div className="p-4 border-t border-border flex-shrink-0 bg-muted/30">
          <p className="font-body text-xs text-muted-foreground text-center">
            AI suggestions require your approval before execution
          </p>
        </div>
      </div>
    </>
  );
};
