import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

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

export default function Services() {
  const [services, setServices] = useState<ServiceHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Services — RealStay';
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('category', 'service')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch (e) {
      console.error('Failed to load services:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 animate-fade-in">
      <div className="container mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Local Services</h1>
          <p className="text-muted-foreground mt-2">Book trusted providers from hosts</p>
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
              <Card key={s.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/hotel/${s.id}`)}>
                <CardContent className="p-0">
                  <AspectRatio ratio={4/3} className="bg-muted rounded-t-lg overflow-hidden">
                    {s.image_url ? (
                      <img src={s.image_url} alt={`${s.name} service image`} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">🛎️</div>
                    )}
                  </AspectRatio>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{s.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{s.city}, {s.country}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description || 'No description provided'}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold">₹{s.price_per_night}</div>
                      <Button size="sm">View & Book</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛎️</div>
            <h3 className="text-xl font-semibold mb-2">No services available yet</h3>
            <p className="text-muted-foreground">Be the first to list a service as a host.</p>
          </div>
        )}
      </div>
    </div>
  );
}
