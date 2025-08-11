import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Profile — RealStay';
  }, []);

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You need to sign in to view your profile.</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 animate-fade-in">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Your Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium">{user.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground">User ID</div>
                <div className="font-mono text-xs break-all">{user.id}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="default" onClick={() => navigate('/my-bookings')}>My Bookings</Button>
                <Button variant="outline" onClick={() => navigate('/my-services')}>My Services</Button>
                <Button variant="outline" onClick={() => navigate('/host-bookings')}>Host Bookings</Button>
                <Button variant="outline" onClick={() => navigate('/host')}>Become a Host</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">More account settings coming soon (profile details, notifications, security).</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
