import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: 'Ogiltig e-postadress' }).max(255, { message: 'E-post får vara max 255 tecken' }),
  password: z.string().min(8, { message: 'Lösenord måste vara minst 8 tecken' }).max(128, { message: 'Lösenord får vara max 128 tecken' })
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validatedData = authSchema.parse({ email, password });
      const { error } = await signIn(validatedData.email, validatedData.password);

      if (error) {
        const message = error.message === 'Invalid login credentials' 
          ? 'Felaktigt email eller lösenord' 
          : error.message === 'Email not confirmed'
          ? 'Du måste bekräfta din e-post innan du kan logga in. Kolla din inkorg!'
          : 'Ett fel uppstod vid inloggning';
        toast.error('Fel vid inloggning', { description: message });
      } else {
        toast.success('Välkommen!', { description: 'Du är nu inloggad' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error('Ogiltig inmatning', { description: error.errors[0].message });
      } else {
        toast.error('Fel vid inloggning', { description: 'Ett oväntat fel uppstod' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validatedData = authSchema.parse({ email, password });
      const { error } = await signUp(validatedData.email, validatedData.password);

      if (error) {
        const message = error.message === 'User already registered' 
          ? 'Det finns redan ett konto med denna e-post' 
          : 'Ett fel uppstod vid registrering';
        toast.error('Fel vid registrering', { description: message });
      } else {
        toast.success('Konto skapat!', {
          description: 'Kolla din e-post för att bekräfta ditt konto innan du loggar in.',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error('Ogiltig inmatning', { description: error.errors[0].message });
      } else {
        toast.error('Fel vid registrering', { description: 'Ett oväntat fel uppstod' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vallöfteskollen</CardTitle>
          <CardDescription>Logga in eller skapa ett konto för att delta</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Skapa konto</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-post</Label>
                  <Input id="login-email" type="email" placeholder="din@email.se" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Lösenord</Label>
                  <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Logga in
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-post</Label>
                  <Input id="signup-email" type="email" placeholder="din@email.se" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Lösenord</Label>
                  <Input id="signup-password" type="password" placeholder="Minst 8 tecken" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Skapa konto
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Du kommer att få ett bekräftelsemail innan du kan logga in.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
