import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

const options = [
  { key: 'home', label: 'Home', emoji: '🏠' },
  { key: 'experience', label: 'Experience', emoji: '🎈' },
  { key: 'service', label: 'Service', emoji: '🛎️' },
] as const;

export type HostCategory = typeof options[number]['key'];

interface EntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EntryModal({ open, onOpenChange }: EntryModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<HostCategory | null>(null);

  const handleSelect = (key: HostCategory) => {
    setSelected(key);
    // Persist selection across auth
    localStorage.setItem('host.selectedCategory', key);
    const target = `/host?category=${key}`;
    if (!user) {
      const redirect = encodeURIComponent(target);
      navigate(`/auth?redirect=${redirect}`);
    } else {
      navigate(target);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>What would you like to host?</DialogTitle>
          <DialogDescription>
            Choose an option to start a quick 3-step setup. You can publish later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => handleSelect(o.key)}
              className={`rounded-xl border p-6 text-center hover-scale ${selected === o.key ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}
            >
              <div className="text-4xl mb-2">{o.emoji}</div>
              <div className="font-semibold">{o.label}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
