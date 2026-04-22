import { useCallback, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Star, Mail, Plus, Loader2, LayoutTemplate, Brain } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { EmailTemplate } from '@/services/emailTemplateService';
import { cn } from '@/lib/utils';
import { StarterTemplateGrid } from '@/components/campaigns/email/StarterTemplateGrid';
import type { StarterTemplate } from '@/data/email-starter-data';

interface TemplateLibraryProps {
  onSelectTemplate: (template: EmailTemplate | null, options?: { initialAiTab?: boolean }) => void;
  /** When set, includes a "Starter" tab with built-in templates in the same tab row as custom & categories. */
  onSelectStarterTemplate?: (starter: StarterTemplate) => void;
}

function formatTabLabel(key: string): string {
  if (key === 'starter') return 'Starter';
  if (key === 'all') return 'All';
  return key.replace(/_/g, ' ');
}

export const TemplateLibrary = ({ onSelectTemplate, onSelectStarterTemplate }: TemplateLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { templates, isLoading } = useEmailTemplates();
  const templatesSectionRef = useRef<HTMLDivElement>(null);

  const uniqueCategories = useMemo(
    () =>
      [...new Set(templates.map((t) => t.category).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      ),
    [templates],
  );

  const tabKeys = useMemo(() => {
    if (onSelectStarterTemplate) {
      const rest = uniqueCategories.filter((c) => c !== 'custom');
      return ['starter', 'custom', ...rest];
    }
    return ['all', ...uniqueCategories];
  }, [onSelectStarterTemplate, uniqueCategories]);

  const [selectedTab, setSelectedTab] = useState<string>(() =>
    onSelectStarterTemplate ? 'custom' : 'all',
  );

  const getTemplatesForTab = useCallback(
    (tabKey: string) => {
      const q = searchQuery.toLowerCase();
      let byTab: EmailTemplate[];
      if (!onSelectStarterTemplate) {
        if (tabKey === 'all') {
          byTab = templates;
        } else {
          byTab = templates.filter((t) => t.category === tabKey);
        }
      } else {
        if (tabKey === 'custom') {
          byTab = templates.filter((t) => t.category === 'custom');
        } else {
          byTab = templates.filter((t) => t.category === tabKey);
        }
      }
      return byTab.filter((template) => {
        const matchesSearch =
          template.name.toLowerCase().includes(q) || (template.subject?.toLowerCase().includes(q) ?? false);
        return matchesSearch;
      });
    },
    [templates, searchQuery, onSelectStarterTemplate],
  );

  const scrollToTemplates = () => {
    setSelectedTab(onSelectStarterTemplate ? 'custom' : 'all');
    setTimeout(() => templatesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const quickStartCards = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        type="button"
        onClick={scrollToTemplates}
        className={cn(
          'text-left rounded-xl border-2 border-border bg-card p-4 shadow-sm transition-colors',
          'hover:border-sunrise/80 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunrise focus-visible:ring-offset-2',
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sunrise/15 mb-3">
          <LayoutTemplate className="h-5 w-5 text-sunrise" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-foreground">Browse templates</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-snug">
          {onSelectStarterTemplate
            ? 'Scroll to Starter, custom, and category tabs below.'
            : 'Scroll to your saved designs and open one to edit.'}
        </p>
      </button>

      <button
        type="button"
        onClick={() => onSelectTemplate(null)}
        className={cn(
          'text-left rounded-xl border-2 border-border bg-card p-4 shadow-sm transition-colors',
          'hover:border-sunrise/80 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunrise focus-visible:ring-offset-2',
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-blue/10 mb-3">
          <Plus className="h-5 w-5 text-sky-blue" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-foreground">New template (blank)</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-snug">
          Build a new design and save it to your library.
        </p>
      </button>

      <button
        type="button"
        onClick={() => onSelectTemplate(null, { initialAiTab: true })}
        className={cn(
          'text-left rounded-xl border-2 border-border bg-card p-4 shadow-sm transition-colors',
          'hover:border-sunrise/80 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunrise focus-visible:ring-offset-2',
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-blue/10 mb-3">
          <Brain className="h-5 w-5 text-sky-blue" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-foreground">New template (AI)</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-snug">
          Draft with the assistant, then save to your library.
        </p>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {quickStartCards}

      <div ref={templatesSectionRef} className="scroll-mt-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={selectedTab === 'starter' ? 'Search built-in templates…' : 'Search in this tab…'}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList
            className={cn(
              'flex h-auto w-full flex-wrap justify-start gap-1 p-1',
              tabKeys.length > 4 ? 'sm:max-h-none' : '',
            )}
          >
            {tabKeys.map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className={cn('capitalize shrink-0', key === 'starter' && 'font-medium')}
              >
                {formatTabLabel(key)}
              </TabsTrigger>
            ))}
          </TabsList>

          {onSelectStarterTemplate ? (
            <TabsContent value="starter" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Built-in recruiting layouts. Your team&apos;s saved emails live in custom and the category tabs.
              </p>
              <StarterTemplateGrid
                onSelect={onSelectStarterTemplate}
                showSourcingChips={false}
                searchQuery={searchQuery}
              />
            </TabsContent>
          ) : null}

          {tabKeys
            .filter((k) => k !== 'starter')
            .map((key) => {
              const list = getTemplatesForTab(key);
              return (
              <TabsContent key={key} value={key} className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-blue" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {list.length === 0 && !isLoading && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No templates in this tab yet. Create one or try another tab.</p>
                      </div>
                    )}

                    {list.map((template) => (
                      <Card key={template.id} className="hover:border-sky-blue/50 transition-colors">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                {template.is_default && (
                                  <Badge className="bg-sunrise/20 text-sunrise border-sunrise">
                                    <Star className="w-3 h-3 mr-1" />
                                    Default
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="capitalize">
                                  {template.category.replace('_', ' ')}
                                </Badge>
                              </div>
                              {template.subject && <CardDescription>Subject: {template.subject}</CardDescription>}
                            </div>
                            <Button variant="outline" onClick={() => onSelectTemplate(template)}>
                              Edit template
                            </Button>
                          </div>
                        </CardHeader>
                        {(template.subject || template.preheader) && (
                          <CardContent>
                            <div className="space-y-4">
                              <div className="bg-muted p-4 rounded-lg space-y-2">
                                {template.subject && (
                                  <div className="font-semibold text-sm text-foreground">Subject: {template.subject}</div>
                                )}
                                {template.preheader && <div className="text-xs text-muted-foreground">{template.preheader}</div>}
                              </div>

                              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                                <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                                <span>Updated: {new Date(template.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              );
            })}
        </Tabs>
      </div>
    </div>
  );
};
