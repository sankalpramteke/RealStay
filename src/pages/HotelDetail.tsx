import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Star, Wifi, Car, Coffee, Users, Calendar } from 'lucide-react';

interface Hotel {
  id: string;
  name: string;
  location: string;
  city: string;
  country: string;
  description: string;
  price_per_night: number;
  rating: number;
  image_url: string;
  amenities: string[];
}

interface Room {
  id: string;
  room_type: string;
  capacity: number;
  price_per_night: number;
  available_rooms: number;
  amenities: string[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
}

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState('1');
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (id) {
      fetchHotelData();
    }
  }, [id]);

  const fetchHotelData = async () => {
    try {
      // Fetch hotel details
      const { data: hotelData, error: hotelError } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', id)
        .single();

      if (hotelError) throw hotelError;
      setHotel(hotelData);

      // Fetch rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', id);

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('hotel_id', id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

    } catch (error) {
      console.error('Error fetching hotel data:', error);
      toast({
        title: "Error",
        description: "Failed to load hotel information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!selectedRoom || !checkInDate || !checkOutDate) {
      toast({
        title: "Missing information",
        description: "Please select a room and dates",
        variant: "destructive"
      });
      return;
    }

    const selectedRoomData = rooms.find(r => r.id === selectedRoom);
    if (!selectedRoomData) return;

    const nights = Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 3600 * 24)
    );
    
    const totalAmount = selectedRoomData.price_per_night * nights;

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          hotel_id: id,
          room_id: selectedRoom,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          guests: parseInt(guests),
          total_amount: totalAmount
        });

      if (error) throw error;

      toast({
        title: "Booking confirmed!",
        description: "Your reservation has been successfully created."
      });

      navigate('/my-bookings');

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking failed",
        description: "There was an error creating your booking",
        variant: "destructive"
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!newReview.comment.trim()) {
      toast({
        title: "Missing comment",
        description: "Please write a review comment",
        variant: "destructive"
      });
      return;
    }

    setSubmittingReview(true);

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          hotel_id: id,
          rating: newReview.rating,
          comment: newReview.comment
        });

      if (error) throw error;

      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback."
      });

      setNewReview({ rating: 5, comment: '' });
      fetchHotelData(); // Refresh reviews

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Failed to submit review",
        description: "There was an error submitting your review",
        variant: "destructive"
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="h-4 w-4" />;
      case 'parking':
        return <Car className="h-4 w-4" />;
      case 'breakfast':
        return <Coffee className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏨</div>
          <h3 className="text-xl font-semibold mb-2">Hotel not found</h3>
          <Button onClick={() => navigate('/hotels')}>Browse Hotels</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        {/* Hotel Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="h-96 bg-muted rounded-lg flex items-center justify-center mb-4">
              {hotel.image_url ? (
                <img 
                  src={hotel.image_url} 
                  alt={hotel.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-8xl">🏨</div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{hotel.name}</h1>
              <div className="flex items-center text-muted-foreground mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{hotel.location}, {hotel.city}, {hotel.country}</span>
              </div>
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-semibold">{hotel.rating}</span>
                <span className="text-muted-foreground ml-2">({reviews.length} reviews)</span>
              </div>
            </div>

            <p className="text-muted-foreground">{hotel.description}</p>

            {hotel.amenities && hotel.amenities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary">
                      {getAmenityIcon(amenity)}
                      <span className="ml-1">{amenity}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-2xl font-bold">
              From ${hotel.price_per_night}/night
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rooms">Rooms & Booking</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="write-review">Write Review</TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Book Your Stay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="checkin">Check-in</Label>
                    <Input
                      id="checkin"
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout">Check-out</Label>
                    <Input
                      id="checkout"
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guests">Guests</Label>
                    <Select value={guests} onValueChange={setGuests}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} Guest{num > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleBooking} className="w-full">
                      Book Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => (
                <Card 
                  key={room.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedRoom === room.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedRoom(room.id)}
                >
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2">{room.room_type}</h3>
                    
                    <div className="flex items-center text-muted-foreground mb-2">
                      <Users className="h-4 w-4 mr-1" />
                      <span>Up to {room.capacity} guests</span>
                    </div>

                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {room.amenities.map((amenity, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {getAmenityIcon(amenity)}
                            <span className="ml-1">{amenity}</span>
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold">${room.price_per_night}</span>
                        <span className="text-muted-foreground">/night</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {room.available_rooms} rooms available
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center mb-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{review.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💭</div>
                <h3 className="text-xl font-semibold mb-2">No reviews yet</h3>
                <p className="text-muted-foreground">Be the first to share your experience!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="write-review" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Write a Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Rating</Label>
                  <div className="flex items-center space-x-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-6 w-6 cursor-pointer transition-colors ${
                          star <= newReview.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-200'
                        }`}
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="comment">Your Review</Label>
                  <Textarea
                    id="comment"
                    placeholder="Share your experience..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="w-full"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}