import { useEffect, useRef, useState, useCallback } from 'react';
import BeefreeSDK from '@beefree.io/sdk';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeefreeEmailEditorProps {
  initialTemplate?: Record<string, unknown> | null;
  onSave: (beeJson: Record<string, unknown>, html: string) => void;
  onCancel: () => void;
}

// Default blank template for BeeFree
const defaultTemplate = {
  page: {
    body: {
      container: {
        style: {
          'background-color': '#FFFFFF',
        },
      },
      content: {
        computedStyle: {
          linkColor: '#54A3DA',
          messageBackgroundColor: '#F4F6F8',
          messageWidth: '600px',
        },
        style: {
          color: '#212121',
          'font-family': 'Arial, Helvetica, sans-serif',
        },
      },
      type: 'mailup-bee-page-properties',
    },
    rows: [],
    template: {
      name: 'template-base',
      type: 'basic',
      version: '2.0.0',
    },
    title: '',
  },
};

// Merge tags for personalization
const mergeTags = [
  { name: 'First Name', value: '{{firstName}}' },
  { name: 'Last Name', value: '{{lastName}}' },
  { name: 'Full Name', value: '{{fullName}}' },
  { name: 'Email', value: '{{email}}' },
  { name: 'Company', value: '{{company}}' },
  { name: 'Job Title', value: '{{jobTitle}}' },
  { name: 'Skills', value: '{{skills}}' },
  { name: 'Location', value: '{{location}}' },
  { name: 'Sender Name', value: '{{senderName}}' },
  { name: 'Sender Company', value: '{{senderCompany}}' },
];

// Special links for email actions
const specialLinks = [
  { type: 'Unsubscribe', label: 'Unsubscribe', link: '{{unsubscribeLink}}' },
  { type: 'View in Browser', label: 'View in Browser', link: '{{viewInBrowserLink}}' },
];

export const BeefreeEmailEditor = ({ 
  initialTemplate, 
  onSave, 
  onCancel 
}: BeefreeEmailEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const beeInstanceRef = useRef<BeefreeSDK | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Stable callback for onSave
  const handleSaveCallback = useCallback((jsonFile: string, htmlFile: string) => {
    try {
      const beeJson = JSON.parse(jsonFile);
      onSave(beeJson, htmlFile);
      toast({
        title: 'Template saved',
        description: 'Your email template has been saved successfully.',
      });
    } catch (err) {
      console.error('Error parsing BeeFree JSON:', err);
      toast({
        title: 'Save failed',
        description: 'Failed to save the template. Please try again.',
        variant: 'destructive',
      });
    }
  }, [onSave, toast]);

  useEffect(() => {
    let isMounted = true;

    const initBeePlugin = async () => {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get auth token from edge function
        const { data, error: authError } = await supabase.functions.invoke('beefree-auth', {
          body: { uid: 'user-' + Date.now() },
        });

        if (!isMounted) return;

        if (authError) {
          throw new Error(`Authentication failed: ${authError.message}`);
        }

        if (!data?.access_token) {
          throw new Error('No access token received from BeeFree');
        }

        console.log('BeeFree auth token received, initializing editor...');

        // Initialize BeeFree SDK with token in constructor
        const bee = new BeefreeSDK(data);

        // Config for the editor
        const beeConfig = {
          uid: 'user-' + Date.now(),
          container: 'bee-plugin-container',
          language: 'en-US',
          mergeTags,
          specialLinks,
          onSave: handleSaveCallback,
          onSaveAsTemplate: (jsonFile: string) => {
            console.log('Save as template:', jsonFile);
          },
          onError: (err: unknown) => {
            const errorMessage = typeof err === 'string' ? err : (err as { message?: string })?.message || 'Unknown error';
            console.error('BeeFree error:', errorMessage);
            toast({
              title: 'Editor error',
              description: errorMessage,
              variant: 'destructive',
            });
          },
          onLoad: () => {
            console.log('BeeFree editor loaded');
            if (isMounted) {
              setIsLoading(false);
            }
          },
        };

        // Start the editor
        await bee.start(beeConfig, initialTemplate || defaultTemplate);
        
        if (isMounted) {
          beeInstanceRef.current = bee;
        }
      } catch (err) {
        console.error('Failed to initialize BeeFree:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize email editor');
          setIsLoading(false);
        }
      }
    };

    initBeePlugin();

    return () => {
      isMounted = false;
      if (beeInstanceRef.current) {
        beeInstanceRef.current = null;
      }
    };
  }, [initialTemplate, handleSaveCallback, toast]);

  const handleSave = () => {
    if (beeInstanceRef.current) {
      beeInstanceRef.current.save();
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <div className="text-destructive text-center">
          <h3 className="text-lg font-semibold mb-2">Failed to load email editor</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          className="bg-gradient-primary hover:opacity-90" 
          size="sm"
          onClick={handleSave}
          disabled={isLoading}
        >
          Save Template
        </Button>
      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-sky-blue" />
              <p className="text-muted-foreground">Loading email editor...</p>
            </div>
          </div>
        )}
        <div 
          id="bee-plugin-container"
          ref={containerRef} 
          className="h-full w-full"
          style={{ minHeight: '600px' }}
        />
      </div>
    </div>
  );
};
