import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, Users, DollarSign, Check, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface BookingRow {
  id: string;
  user_id: string;
  hotel_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_amount: number;
  status: string;
  created_at: string;
  hotels: { name: string; city: string; country: string; location: string };
  rooms: { room_type: string };
  profiles?: { full_name: string | null; email: string | null };
}

export default function HostBookings() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('host-bookings-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
        setRows((prev) => prev.map((b) => (b.id === (payload.new as any).id ? { ...b, status: (payload.new as any).status } : b)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, hotels(name, city, country, location), rooms(room_type), profiles:profiles(full_name, email)`) // RLS restricts to host's hotels
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows(data as any || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingRows(false);
    }
  };

  const setStatus = async (id: string, status: 'confirmed'|'cancelled') => {
    try {
      setUpdating(id);
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Updated', description: `Booking ${status}.` });
    } catch (e:any) {
      toast({ title: 'Failed', description: e.message || 'Could not update', variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Host Bookings</h1>
          <p className="text-muted-foreground">Approve or cancel incoming bookings for your listings</p>
        </div>

        {loadingRows ? (
          <div>Loading...</div>
        ) : rows.length ? (
          <div className="space-y-6">
            {rows.map((b) => (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{b.hotels.name}</CardTitle>
                    <Badge variant={b.status === 'pending' ? 'outline' : b.status === 'confirmed' ? 'default' : 'destructive'}>{b.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center text-muted-foreground text-sm"><MapPin className="h-4 w-4 mr-2"/>Location</div>
                      <div className="font-medium">{b.hotels.location}, {b.hotels.city}</div>
                      <div className="text-sm text-muted-foreground">{b.hotels.country}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground text-sm"><Calendar className="h-4 w-4 mr-2"/>Dates</div>
                      <div className="font-medium">{new Date(b.check_in_date).toLocaleDateString()} → {new Date(b.check_out_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground text-sm"><Users className="h-4 w-4 mr-2"/>Guest</div>
                      <div className="font-medium">{b.guests} · {b.rooms?.room_type}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground text-sm"><DollarSign className="h-4 w-4 mr-2"/>Total</div>
                      <div className="font-bold">₹{b.total_amount}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Guest: {b.profiles?.full_name || 'Unknown'} ({b.profiles?.email || '—'})</div>
                    {b.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setStatus(b.id, 'confirmed')} disabled={!!updating}><Check className="h-4 w-4 mr-1"/>Confirm</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(b.id, 'cancelled')} disabled={!!updating}><X className="h-4 w-4 mr-1"/>Cancel</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No bookings yet.</div>
        )}
      </div>
    </div>
  );
}
