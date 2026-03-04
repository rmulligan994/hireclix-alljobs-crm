"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSignIn, useSignUp, useAuth } from '@/hooks/useAuth';
import { Loader2, Mail, AlertCircle, X } from 'lucide-react';
import { userService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const signIn = useSignIn();
  const signUp = useSignUp();

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ 
    email: '', 
    password: '', 
    firstName: '', 
    lastName: '' 
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  // Check for auth error in URL (e.g. otp_expired from expired confirmation link)
  useEffect(() => {
    const error = searchParams?.get('error');
    const message = searchParams?.get('message');
    if (error === 'otp_expired') {
      setAuthError('Your confirmation link has expired. Request a new one below.');
    } else if (error) {
      setAuthError(message || 'Something went wrong. Please try again.');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = searchParams?.get('from') || '/';
      router.push(from);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn.mutateAsync(signInData);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp.mutateAsync(signUpData);
    setActiveTab('signin');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B3555] to-[#54A3DA] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#0B3555]">
            Project Beacon
          </CardTitle>
          <CardDescription>
            Relationship-first Recruiting CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <div className="relative mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
                <div className="flex-1 space-y-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6"
                    onClick={() => {
                      setAuthError(null);
                      router.replace('/auth');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="text-sm text-foreground">{authError}</p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Your email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!resendEmail || resending}
                      onClick={async () => {
                        if (!resendEmail) return;
                        setResending(true);
                        try {
                          await userService.resendConfirmationEmail(resendEmail);
                          toast({ title: 'Confirmation email sent', description: 'Check your inbox for the new link.' });
                          setAuthError(null);
                          router.replace('/auth');
                        } catch (e) {
                          toast({ title: 'Failed to resend', description: (e as Error).message, variant: 'destructive' });
                        } finally {
                          setResending(false);
                        }
                      }}
                    >
                      {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Resend
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="demo@beacon.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#0B3555] hover:bg-[#54A3DA]"
                  disabled={signIn.isPending}
                >
                  {signIn.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstName">First Name</Label>
                    <Input
                      id="signup-firstName"
                      placeholder="Demo"
                      value={signUpData.firstName}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastName">Last Name</Label>
                    <Input
                      id="signup-lastName"
                      placeholder="User"
                      value={signUpData.lastName}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="demo@beacon.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#0B3555] hover:bg-[#54A3DA]"
                  disabled={signUp.isPending}
                >
                  {signUp.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
