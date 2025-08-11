import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Calendar, Users, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_amount: number;
  status: string;
  created_at: string;
  hotels: {
    name: string;
    location: string;
    city: string;
    country: string;
  };
  rooms: {
    room_type: string;
  };
}

export default function MyBookings() {
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  // Realtime status updates for the current user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('bookings-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, (payload) => {
        setBookings((prev) => prev.map((b) => (b.id === (payload.new as any).id ? { ...b, status: (payload.new as any).status } : b)));
        toast({ title: 'Booking updated', description: `Your booking is now ${(payload.new as any).status}.` });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          hotels (name, location, city, country),
          rooms (room_type)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const diffTime = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const canComplete = (checkOut: string) => {
    const today = new Date();
    const co = new Date(checkOut);
    // allow complete if checkout is today or in the past
    return co <= new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const updateStatus = async (bookingId: string, next: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    try {
      setUpdatingId(bookingId);
      const { error } = await supabase
        .from('bookings')
        .update({ status: next })
        .eq('id', bookingId)
        .eq('user_id', user!.id);
      if (error) throw error;
      toast({ title: 'Status updated', description: `Booking marked as ${next}.` });
      await fetchBookings();
    } catch (e: any) {
      console.error('Update status error:', e);
      toast({ title: 'Failed to update', description: e?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loadingBookings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">Manage your hotel reservations</p>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{booking.hotels.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                      {/* Host-driven workflow: actions are managed by host; user sees status only */}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="text-sm">Location</span>
                      </div>
                      <p className="font-medium">
                        {booking.hotels.location}, {booking.hotels.city}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.hotels.country}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="text-sm">Dates</span>
                      </div>
                      <p className="font-medium">
                        {formatDate(booking.check_in_date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        to {formatDate(booking.check_out_date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {calculateNights(booking.check_in_date, booking.check_out_date)} night{calculateNights(booking.check_in_date, booking.check_out_date) !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        <span className="text-sm">Room & Guests</span>
                      </div>
                      <p className="font-medium">{booking.rooms.room_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span className="text-sm">Total Amount</span>
                      </div>
                      <p className="font-bold text-lg">₹{booking.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Booked on {formatDate(booking.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-6">
              Start exploring amazing hotels and make your first booking!
            </p>
            <a 
              href="/hotels" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Browse Hotels
            </a>
          </div>
        )}
      </div>
    </div>
  );
}