import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import useChatStore from '../store/chatStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSportConfig, getPeriodOptions, formatGameTime, DEFAULT_SPORT } from '../lib/sportConfig';

/**
 * TimeSync Component
 *
 * Allows users to input their current game time and sync with the server
 * to calculate their offset from other viewers.
 *
 * Updated in Phase 8 to support multiple sports with different:
 * - Period counts (4 quarters, 3 periods, 2 halves)
 * - Period durations (12, 15, 20, 45 minutes)
 * - Clock directions (countdown vs countup)
 */
function TimeSync({ onSync, autoSyncTrigger, onStartCountdown }) {
  // Get sport type from store (set when joining room)
  const { sportType, sportConfig, isSynced, gameTime, offsetFormatted, isBaseline } = useChatStore();

  // Get sport configuration - use server config if available, else lookup by type
  const config = useMemo(() => {
    if (sportConfig) return sportConfig;
    return getSportConfig(sportType || DEFAULT_SPORT);
  }, [sportType, sportConfig]);

  // Get period options for the dropdown
  const periodOptions = useMemo(() => {
    return getPeriodOptions(sportType || DEFAULT_SPORT);
  }, [sportType]);

  // Initialize with appropriate defaults based on clock direction
  const [period, setPeriod] = useState('1');
  const [minutes, setMinutes] = useState(() => {
    return config.clockDirection === 'down' ? config.periodDurationMinutes : 0;
  });
  const [seconds, setSeconds] = useState(0);

  // After syncing, collapse the form to a compact one-line summary.
  // showForm=true when unsynced (user needs to fill it in), false after a successful sync.
  const [showForm, setShowForm] = useState(!isSynced);
  const prevSyncedRef = useRef(isSynced);
  useEffect(() => {
    if (isSynced && !prevSyncedRef.current) {
      setShowForm(false); // just synced — collapse
    }
    prevSyncedRef.current = isSynced;
  }, [isSynced]);

  // Core sync logic — shared between manual submit and countdown auto-trigger
  const trySync = useCallback(() => {
    const p = parseInt(period, 10);
    const m = parseInt(minutes, 10);
    const s = parseInt(seconds, 10);

    if (p < 1 || p > config.periods) {
      alert(`${config.periodLabel} must be 1-${config.periods}`);
      return;
    }
    if (s < 0 || s > 59) {
      alert('Seconds must be 0-59');
      return;
    }
    if (config.clockDirection === 'down') {
      if (m < 0 || m > config.periodDurationMinutes) {
        alert(`Minutes must be 0-${config.periodDurationMinutes}`);
        return;
      }
      if (m === config.periodDurationMinutes && s > 0) {
        alert(`Time cannot exceed ${config.periodDurationMinutes}:00`);
        return;
      }
    } else {
      if (m < 0 || m > config.maxMinutes) {
        alert(`Minutes must be 0-${config.maxMinutes}`);
        return;
      }
    }

    onSync(p, m, s);
  }, [period, minutes, seconds, config, onSync]);

  const handleSync = (e) => {
    e.preventDefault();
    trySync();
  };

  // Auto-submit when countdown fires
  useEffect(() => {
    if (autoSyncTrigger) {
      trySync();
    }
  }, [autoSyncTrigger, trySync]);

  // Format game time for display using sport-specific formatting
  const displayGameTime = useMemo(() => {
    if (!gameTime) return null;
    return formatGameTime(gameTime, sportType || DEFAULT_SPORT);
  }, [gameTime, sportType]);

  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm">Sync Game Time</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3 space-y-2">

        {/* Compact synced summary — shown after a successful sync */}
        {isSynced && !showForm && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">{displayGameTime}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs h-6 px-2 -mr-1 flex-shrink-0"
                onClick={() => setShowForm(true)}
              >
                Resync
              </Button>
            </div>
            <Badge variant={isBaseline ? 'default' : 'secondary'} className="text-xs h-5">
              {isBaseline ? 'Live' : offsetFormatted}
            </Badge>
          </div>
        )}

        {/* Full form — shown when unsynced or when user clicks Resync */}
        {showForm && (
          <form onSubmit={handleSync} className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <Label htmlFor="period" className="text-xs">{config.periodLabel}</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <Label htmlFor="minutes" className="text-xs">Min</Label>
                <Input
                  type="number"
                  id="minutes"
                  min="0"
                  max={config.clockDirection === 'down' ? config.periodDurationMinutes : config.maxMinutes}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-full h-9"
                />
              </div>

              <span className="text-lg font-bold mb-1 flex-shrink-0">:</span>

              <div className="space-y-1 flex-1 min-w-0">
                <Label htmlFor="seconds" className="text-xs">Sec</Label>
                <Input
                  type="number"
                  id="seconds"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  className="w-full h-9"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {config.clockDirection === 'down'
                ? 'Enter time remaining (clock counts down)'
                : 'Enter elapsed time (clock counts up)'}
            </p>

            <Button type="submit" size="sm" className="w-full">
              {isSynced ? 'Resync' : 'Sync Time'}
            </Button>

            {onStartCountdown && (
              <div className="space-y-1 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={onStartCountdown}
                >
                  Countdown Sync
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Best during a timeout — pre-fill your time above first
                </p>
              </div>
            )}
          </form>
        )}

      </CardContent>
    </Card>
  );
}

export default TimeSync;
