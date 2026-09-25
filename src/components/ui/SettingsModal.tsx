"use client";

import { toggleMusicExplicitly, useSettings } from "@/components/providers/SettingsProvider";
import { Button } from "./Button";
import { Modal } from "./Modal";

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-bg-soft px-4 py-3">
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs font-medium text-ink-muted">{hint}</span>
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? "bg-success" : "bg-disabled"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update, reset } = useSettings();
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <h2 className="display text-2xl">Settings</h2>
      <p className="mt-1 text-sm font-medium text-ink-muted">Saved on this device only.</p>

      <h3 className="mt-5 text-xs font-black uppercase tracking-widest text-ink-muted">Audio</h3>
      <div className="mt-2 flex flex-col gap-2">
        <Toggle id="sfx" label="Sound effects" hint="Selection, moves, wins and alerts" checked={settings.sfx && !settings.muted} onChange={(v) => update({ sfx: v })} />
        <Toggle
          id="music"
          label="Ambient music"
          hint="Quiet tactical drone (starts after interaction)"
          checked={settings.music && !settings.muted}
          onChange={(v) => {
            update({ music: v });
            toggleMusicExplicitly(v && !settings.muted);
          }}
        />
        <Toggle
          id="muted"
          label="Master mute"
          hint="Silence everything"
          checked={settings.muted}
          onChange={(v) => {
            update({ muted: v });
            if (v) toggleMusicExplicitly(false);
            else if (settings.music) toggleMusicExplicitly(true);
          }}
        />
      </div>

      <h3 className="mt-5 text-xs font-black uppercase tracking-widest text-ink-muted">Accessibility</h3>
      <div className="mt-2 flex flex-col gap-2">
        <Toggle id="motion" label="Reduce motion" hint="Turns off non-essential animation" checked={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
        <Toggle id="contrast" label="High contrast" hint="Stronger borders and backgrounds" checked={settings.highContrast} onChange={(v) => update({ highContrast: v })} />
      </div>

      <h3 className="mt-5 text-xs font-black uppercase tracking-widest text-ink-muted">Gameplay</h3>
      <div className="mt-2 flex flex-col gap-2">
        <Toggle id="legal" label="Show legal moves" hint="Highlight destinations for the selected piece" checked={settings.showLegalMoves} onChange={(v) => update({ showLegalMoves: v })} />
        <label className="block rounded-xl border border-line bg-bg-soft px-4 py-3">
          <span className="block text-sm font-bold">Display name</span>
          <span className="block text-xs font-medium text-ink-muted">Used in online rooms</span>
          <input
            className="input mt-2"
            maxLength={16}
            value={settings.displayName}
            placeholder="e.g. Shadow"
            autoComplete="nickname"
            enterKeyHint="done"
            onChange={(e) => update({ displayName: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={reset}>Reset preferences</Button>
        <Button variant="play" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
