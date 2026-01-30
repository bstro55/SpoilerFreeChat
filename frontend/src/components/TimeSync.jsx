import { useState } from 'react';
import useChatStore from '../store/chatStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * TimeSync Component
 *
 * Allows users to input their current game time (quarter, minutes, seconds)
 * and sync with the server to calculate their offset from other viewers.
 */
function TimeSync({ onSync }) {
  const [quarter, setQuarter] = useState('1');
  const [minutes, setMinutes] = useState(12);
  const [seconds, setSeconds] = useState(0);

  const { isSynced, gameTime, offsetFormatted, isBaseline } = useChatStore();

  const handleSync = (e) => {
    e.preventDefault();

    const q = parseInt(quarter, 10);
    const m = parseInt(minutes, 10);
    const s = parseInt(seconds, 10);

    if (q < 1 || q > 4) {
      alert('Quarter must be 1-4');
      return;
    }
    if (m < 0 || m > 12) {
      alert('Minutes must be 0-12');
      return;
    }
    if (s < 0 || s > 59) {
      alert('Seconds must be 0-59');
      return;
    }
    if (m === 12 && s > 0) {
      alert('Time cannot exceed 12:00');
      return;
    }

    onSync(q, m, s);
  };

  const formatGameTime = (gt) => {
    if (!gt) return null;
    return `Q${gt.quarter} ${gt.minutes}:${gt.seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Sync Game Time</CardTitle>
        <CardDescription className="text-xs">
          Enter the time shown on your broadcast
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-3">
        <form onSubmit={handleSync} className="space-y-3">
          <div className="flex items-end gap-2">
            {/* Quarter Selector */}
            <div className="space-y-1">
              <Label htmlFor="quarter" className="text-xs">Quarter</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="w-16 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minutes Input */}
            <div className="space-y-1">
              <Label htmlFor="minutes" className="text-xs">Min</Label>
              <Input
                type="number"
                id="minutes"
                min="0"
                max="12"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-14 h-9"
              />
            </div>

            <span className="text-lg font-bold mb-1">:</span>

            {/* Seconds Input */}
            <div className="space-y-1">
              <Label htmlFor="seconds" className="text-xs">Sec</Label>
              <Input
                type="number"
                id="seconds"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                className="w-14 h-9"
              />
            </div>
          </div>

          <Button type="submit" size="sm" className="w-full">
            {isSynced ? 'Resync' : 'Sync Time'}
          </Button>
        </form>

        {isSynced && (
          <div className="space-y-1 pt-2 border-t text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Game time:</span>
              <span className="font-medium">{formatGameTime(gameTime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Your delay:</span>
              <Badge variant={isBaseline ? 'default' : 'secondary'}>
                {offsetFormatted}
                {isBaseline && ' (Baseline)'}
              </Badge>
            </div>
          </div>
        )}

        {!isSynced && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Sync to enable spoiler-free chat
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default TimeSync;
