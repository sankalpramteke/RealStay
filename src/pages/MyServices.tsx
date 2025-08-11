import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ServiceHotel {
  id: string;
  name: string;
  location: string;
  city: string;
  country: string;
  description: string | null;
  image_url: string | null;
  price_per_night: number;
  rating: number | null;
}

export default function MyServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'My Services — RealStay';
    if (user) fetchMyServices();
  }, [user]);

  const fetchMyServices = async () => {
    try {
      // Step 1: get listing ids owned by this user for services
      const { data: listings, error: listErr } = await supabase
        .from('listings' as any)
        .select('id')
        .eq('host_id', user!.id)
        .eq('category', 'service')
        .eq('status', 'published');
      if (listErr) throw listErr;

      const ids = (listings || []).map((l: any) => l.id);
      if (!ids.length) {
        setServices([]);
        return;
      }

      // Step 2: load hotels by those ids
      const { data: hotels, error: hotErr } = await supabase
        .from('hotels')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });
      if (hotErr) throw hotErr;
      setServices((hotels as any) || []);
    } catch (e) {
      console.error('Failed to load my services:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 animate-fade-in">
      <div className="container mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold">My Services</h1>
          <p className="text-muted-foreground mt-2">Your listed services as a host</p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <div className="w-full h-48 bg-muted rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <Card key={s.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <AspectRatio ratio={4/3} className="bg-muted rounded-t-lg overflow-hidden">
                    {s.image_url ? (
                      <img src={s.image_url} alt={`${s.name} image`} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">🛎️</div>
                    )}
                  </AspectRatio>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">{s.city}, {s.country}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description || 'No description provided'}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold">₹{s.price_per_night}</div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/hotel/${s.id}`)}>View</Button>
                        <Button size="sm" onClick={() => navigate('/host-bookings')}>Requests</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛎️</div>
            <h3 className="text-xl font-semibold mb-2">You haven't listed any services yet</h3>
            <p className="text-muted-foreground mb-4">Create a new service from Become a host.</p>
            <Button onClick={() => navigate('/host?category=service')}>List a service</Button>
          </div>
        )}
      </div>
    </div>
  );
}
