import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Star, TrendingUp, Mail, Plus, Loader2 } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { EmailTemplate } from '@/services/emailTemplateService';

interface TemplateLibraryProps {
  onSelectTemplate: (template: EmailTemplate | null) => void;
}

export const TemplateLibrary = ({ onSelectTemplate }: TemplateLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { templates, isLoading } = useEmailTemplates();

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (template.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from templates
  const categories = ['all', ...new Set(templates.map(t => t.category))];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search templates..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 6)}, 1fr)` }}>
          {categories.slice(0, 6).map(category => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category === 'all' ? 'All' : category.replace('_', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sky-blue" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {/* Create Blank Template Card */}
              <Card className="border-dashed border-2 border-sky-blue/30 hover:border-sky-blue/60 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="bg-sky-blue/10 p-3 rounded-lg">
                        <Plus className="w-6 h-6 text-sky-blue" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Start from Scratch</CardTitle>
                        <CardDescription>Create a custom email template with the visual editor</CardDescription>
                      </div>
                    </div>
                    <Button 
                      className="bg-gradient-primary hover:opacity-90"
                      onClick={() => onSelectTemplate(null)}
                    >
                      Create
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Template Cards */}
              {filteredTemplates.length === 0 && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found. Create your first template!</p>
                </div>
              )}

              {filteredTemplates.map((template) => (
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
                        {template.subject && (
                          <CardDescription>Subject: {template.subject}</CardDescription>
                        )}
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => onSelectTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardHeader>
                  {(template.subject || template.preheader) && (
                    <CardContent>
                      <div className="space-y-4">
                        {/* Preview */}
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          {template.subject && (
                            <div className="font-semibold text-sm text-foreground">
                              Subject: {template.subject}
                            </div>
                          )}
                          {template.preheader && (
                            <div className="text-xs text-muted-foreground">
                              {template.preheader}
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
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
      </Tabs>
    </div>
  );
};
