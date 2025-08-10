import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Stepper from '@/components/host/Stepper';
import MapboxAddressPicker from '@/components/maps/MapboxAddressPicker';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Minimal amenities list for demo
const AMENITIES = ['Wi‑Fi','Kitchen','Washer','Air conditioning','Dedicated workspace','TV','Free parking','Pool','Hot tub','BBQ grill'];

export default function Host() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();

  const initialCategory = (params.get('category') || localStorage.getItem('host.selectedCategory') || 'home') as 'home'|'experience'|'service';

  // Stepper
  const [step, setStep] = useState(1);

  // Listing identity
  const [listingId, setListingId] = useState<string | null>(null);
  const [category, setCategory] = useState<'home'|'experience'|'service'>(initialCategory);

  // Step 1 fields
  const [propertyType, setPropertyType] = useState('');
  const [roomType, setRoomType] = useState<'entire'|'private'|'shared'|''>('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [guests, setGuests] = useState<number>(1);
  const [bedrooms, setBedrooms] = useState<number>(0);
  const [beds, setBeds] = useState<number>(0);
  const [bathrooms, setBathrooms] = useState<number>(0);

  // Step 2 fields
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);

  // Step 3 fields
  const [basePrice, setBasePrice] = useState<string>('');
  const [currency, setCurrency] = useState<string>('INR');
  const [minNights, setMinNights] = useState<number>(1);
  const [maxNights, setMaxNights] = useState<number>(30);

  // Autosave helper
  const saveTimer = useRef<number | undefined>(undefined);
  const scheduleAutosave = () => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveDraft();
    }, 600);
  };

  // Ensure auth (deep link)
  useEffect(() => {
    if (!user) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?redirect=${redirect}`);
    }
  }, [user, location.pathname, location.search, navigate]);

  // Load existing draft from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('host.draft');
    if (raw) {
      try {
        const d = JSON.parse(raw);
        setListingId(d.listingId ?? null);
        setCategory(d.category ?? initialCategory);
        setPropertyType(d.propertyType ?? '');
        setRoomType(d.roomType ?? '');
        setAddress(d.address ?? '');
        setLat(d.lat ?? '');
        setLng(d.lng ?? '');
        setGuests(d.guests ?? 1);
        setBedrooms(d.bedrooms ?? 0);
        setBeds(d.beds ?? 0);
        setBathrooms(d.bathrooms ?? 0);
        setPhotos(d.photos ?? []);
        setTitle(d.title ?? '');
        setDescription(d.description ?? '');
        setAmenities(d.amenities ?? []);
        setBasePrice(d.basePrice ?? '');
        setCurrency(d.currency ?? 'INR');
        setMinNights(d.minNights ?? 1);
        setMaxNights(d.maxNights ?? 30);
      } catch (_) {}
    }
  }, [initialCategory]);

  // Persist to localStorage for recovery
  const persistLocal = () => {
    const payload = {
      listingId, category, propertyType, roomType,
      address, lat, lng, guests, bedrooms, beds, bathrooms,
      photos, title, description, amenities,
      basePrice, currency, minNights, maxNights,
    };
    localStorage.setItem('host.draft', JSON.stringify(payload));
  };

  // Create draft in DB if needed
  const ensureDraftInDB = async () => {
    if (!user) return;
    try {
      if (!listingId) {
        // Try find last draft
        const { data } = await (supabase.from('listings' as any) as any)
          .select('id')
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1);
        const existing = data?.[0]?.id as string | undefined;
        if (existing) {
          setListingId(existing);
          return existing;
        }
        // Create new draft
        const { data: created, error } = await (supabase.from('listings' as any) as any)
          .insert({ host_id: user.id, category, status: 'draft' })
          .select('id')
          .single();
        if (error) throw error;
        setListingId(created.id);
        persistLocal();
        return created.id as string;
      }
      return listingId;
    } catch (err) {
      // Silent fallback to local-only
      return null;
    }
  };

  // Save draft (DB + local)
  const saveDraft = async () => {
    persistLocal();
    if (!user) return;
    try {
      const id = await ensureDraftInDB();
      if (!id) return;
      const payload: any = {
        category,
        property_type: propertyType || null,
        room_type: roomType || null,
        address: address || null,
        coordinates: (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
        guests,
        bedrooms,
        beds,
        bathrooms,
        photos,
        title: title || null,
        description: description || null,
        amenities,
        pricing: { base_price: basePrice ? Number(basePrice) : null, currency },
        availability: { min_nights: minNights, max_nights: maxNights },
      };
      await (supabase.from('listings' as any) as any)
        .update(payload)
        .eq('id', id);
    } catch (_) {
      // ignore - kept locally
    }
  };

  // AI suggestions
  const [aiLoading, setAiLoading] = useState(false);
  const suggestWithAI = async () => {
    try {
      setAiLoading(true);
      const { data, error } = await (supabase.functions as any).invoke('generate-listing-copy', {
        body: { category, propertyType, roomType, address, guests, bedrooms, beds, bathrooms, amenities, photos },
      });
      if (error) throw error;
      if (data?.title) setTitle(data.title);
      if (data?.description) setDescription(data.description);
      toast({ title: 'Suggestions added', description: 'You can edit them anytime.' });
      scheduleAutosave();
    } catch (err: any) {
      toast({ title: 'Could not generate suggestions', description: err.message || 'Please try again.' });
    } finally {
      setAiLoading(false);
    }
  };

  // Photo upload
  const onFilesSelected = async (files: FileList | null) => {
    if (!files || !user) return;
    const id = await ensureDraftInDB();
    if (!id) {
      toast({ title: 'Saved locally', description: 'Draft will sync when backend is ready.' });
      return;
    }
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const path = `${user.id}/${id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
        if (data?.publicUrl) urls.push(data.publicUrl);
      } catch (err) {
        console.error(err);
      }
    }
    if (urls.length) {
      const next = [...photos, ...urls];
      setPhotos(next);
      await saveDraft();
    }
  };

  // Navigation actions
  const nextDisabled = useMemo(() => {
    if (step === 1) return !propertyType || !roomType || !guests || !address;
    if (step === 2) return !title.trim(); // relaxed: photos optional
    if (step === 3) return !basePrice;
    return false;
  }, [step, propertyType, roomType, guests, address, title, basePrice]);

  const goNext = async () => {
    await saveDraft();
    setStep((s) => Math.min(3, s + 1));
  };
  const goBack = async () => {
    await saveDraft();
    setStep((s) => Math.max(1, s - 1));
  };

  const exit = async () => {
    await saveDraft();
    toast({ title: 'Draft saved', description: 'Resume anytime from Become a host.' });
    navigate('/');
  };

  const publish = async () => {
    try {
      const id = await ensureDraftInDB();
      if (!id) throw new Error('No draft id');
      await (supabase.from('listings' as any) as any)
        .update({ status: 'published' })
        .eq('id', id);
      toast({ title: 'Published', description: 'Your listing is now live.' });
      localStorage.removeItem('host.draft');
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Could not publish', description: err.message || 'Please complete all required fields.' });
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 animate-fade-in">
      <div className="container mx-auto max-w-4xl">
        <header className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold">It’s easy to get started</h1>
          <p className="text-muted-foreground mt-2">Complete a few steps to create your draft. You can publish later.</p>
        </header>

        <Stepper current={step} title={step === 1 ? 'Tell us about your place' : step === 2 ? 'Make it stand out' : 'Finish up and publish'} />

        {/* Step content */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label>Property type</Label>
                <Input placeholder="e.g., Apartment, Cabin, Villa" value={propertyType} onChange={(e)=>{setPropertyType(e.target.value); scheduleAutosave();}} />
                <p className="text-xs text-muted-foreground mt-1">Choose the option that best matches your place.</p>
              </div>

              <div>
                <Label>Room type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  {[
                    {key:'entire', label:'Entire place'},
                    {key:'private', label:'Private room'},
                    {key:'shared', label:'Shared room'}
                  ].map(o => (
                    <button key={o.key} onClick={()=>{setRoomType(o.key as any); scheduleAutosave();}} className={`rounded-lg border p-4 text-left ${roomType===o.key ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <MapboxAddressPicker
                value={address}
                lat={lat}
                lng={lng}
                mapToken={localStorage.getItem('MAPBOX_PUBLIC_TOKEN') || undefined}
                onChange={(v) => {
                  setAddress(v.address);
                  setLat(v.lat);
                  setLng(v.lng);
                  scheduleAutosave();
                }}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Guests</Label>
                  <Input type="number" min={1} value={guests} onChange={(e)=>{setGuests(Number(e.target.value)); scheduleAutosave();}} />
                </div>
                <div>
                  <Label>Bedrooms</Label>
                  <Input type="number" min={0} value={bedrooms} onChange={(e)=>{setBedrooms(Number(e.target.value)); scheduleAutosave();}} />
                </div>
                <div>
                  <Label>Beds</Label>
                  <Input type="number" min={0} value={beds} onChange={(e)=>{setBeds(Number(e.target.value)); scheduleAutosave();}} />
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <Input type="number" min={0} value={bathrooms} onChange={(e)=>{setBathrooms(Number(e.target.value)); scheduleAutosave();}} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={exit}>Save & exit</Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={goBack} disabled={step===1}>Back</Button>
                  <Button onClick={goNext} disabled={nextDisabled}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label>Photos (add 5+)</Label>
                <input type="file" accept="image/*" multiple onChange={(e)=> onFilesSelected(e.target.files)} className="mt-2" />
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {photos.map((url, i) => (
                      <img key={i} src={url} alt={`Listing photo ${i+1}`} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-md" />
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Add at least 5 photos. Bright, horizontal shots work best.</p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Title</Label>
                  <Button size="sm" variant="secondary" onClick={suggestWithAI} disabled={aiLoading}>
                    {aiLoading ? 'Generating…' : 'Suggest with AI'}
                  </Button>
                </div>
                <Input placeholder="Sunny 1-bedroom near the waterfront" value={title} onChange={(e)=>{setTitle(e.target.value); scheduleAutosave();}} />
                <p className="text-xs text-muted-foreground mt-1">Highlight what's unique.</p>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea rows={5} placeholder="Highlight what’s unique. 300–500 characters suggested." value={description} onChange={(e)=>{setDescription(e.target.value); scheduleAutosave();}} />
              </div>

              <div>
                <Label>Amenities</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {AMENITIES.map(a => (
                    <label key={a} className={`rounded-md border px-3 py-2 text-sm cursor-pointer ${amenities.includes(a) ? 'border-primary ring-1 ring-primary/30' : 'border-muted'}`}>
                      <input type="checkbox" className="mr-2" checked={amenities.includes(a)} onChange={(e)=>{
                        const next = e.target.checked ? [...amenities, a] : amenities.filter(x=>x!==a);
                        setAmenities(next); scheduleAutosave();
                      }} />
                      {a}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={exit}>Save & exit</Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={goBack}>Back</Button>
                  <Button onClick={goNext} disabled={nextDisabled}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Base price per night</Label>
                  <Input type="number" min={0} value={basePrice} onChange={(e)=>{setBasePrice(e.target.value); scheduleAutosave();}} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={currency} onChange={(e)=>{setCurrency(e.target.value); scheduleAutosave();}} />
                </div>
                <div>
                  <Label>Min nights</Label>
                  <Input type="number" min={1} value={minNights} onChange={(e)=>{setMinNights(Number(e.target.value)); scheduleAutosave();}} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Max nights</Label>
                  <Input type="number" min={minNights} value={maxNights} onChange={(e)=>{setMaxNights(Number(e.target.value)); scheduleAutosave();}} />
                </div>
                <div className="sm:col-span-2">
                  <Label>House rules (optional)</Label>
                  <Textarea rows={3} placeholder="Quiet hours, pets policy, etc." />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Preview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {photos.slice(0,3).map((url, i) => (
                    <img key={i} src={url} alt={`Preview ${i+1}`} className="w-full aspect-[4/3] object-cover rounded-md" />
                  ))}
                </div>
                <div className="mt-3">
                  <p className="font-medium">{title || 'Untitled listing'}</p>
                  <p className="text-sm text-muted-foreground">{address || 'Address not set'}</p>
                  <p className="text-sm">{basePrice ? `${currency} ${basePrice}/night` : 'Price not set'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={exit}>Save & exit</Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={goBack}>Back</Button>
                  <Button onClick={publish} disabled={nextDisabled}>Publish listing</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
