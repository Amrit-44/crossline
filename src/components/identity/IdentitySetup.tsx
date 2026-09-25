"use client";

import { useState } from "react";
import { AVATARS, NAME_MAX, NAME_MIN, isValidName, sanitizeName } from "@/lib/identity";
import { Avatar } from "./Avatar";

interface IdentitySetupProps {
  initialName: string;
  initialAvatar: string;
  heading?: string;
  subheading?: string;
  submitLabel?: string;
  onSubmit: (identity: { name: string; avatar: string }) => void;
}

/** Polished name + avatar setup used before local / bot / online play. */
export function IdentitySetup({
  initialName,
  initialAvatar,
  heading = "Choose your identity",
  subheading = "Pick a display name and avatar. Stored on this device only.",
  submitLabel = "Continue",
  onSubmit,
}: IdentitySetupProps) {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [touched, setTouched] = useState(false);
  const clean = sanitizeName(name);
  const valid = isValidName(name);

  return (
    <div className="card mx-auto w-full max-w-md p-4 sm:p-8">
      <h2 className="display text-3xl">{heading}</h2>
      <p className="mt-1 text-sm font-medium text-ink-soft">{subheading}</p>

      <div className="mt-5 flex justify-center">
        <Avatar id={avatar} size={72} label="Selected avatar preview" />
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-label="Choose avatar">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={avatar === a.id}
            aria-label={a.label}
            title={a.label}
            onClick={() => setAvatar(a.id)}
            className={`flex aspect-square items-center justify-center rounded-xl border transition-transform hover:scale-105 ${
              avatar === a.id ? "border-x shadow-[2px_2px_0_#2e2118]" : "border-line bg-bg-soft"
            }`}
          >
            <Avatar id={a.id} size={34} label={a.label} />
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-bold text-ink-soft">Display name</span>
        <input
          className="input min-h-12 text-base"
          value={name}
          maxLength={NAME_MAX}
          placeholder="e.g. Shadow"
          autoComplete="nickname"
          enterKeyHint="done"
          onChange={(e) => {
            setName(e.target.value);
            setTouched(true);
          }}
          aria-invalid={touched && !valid}
          aria-describedby="identity-name-hint"
        />
      </label>
      <p id="identity-name-hint" className={`mt-1.5 text-xs font-semibold ${touched && !valid ? "text-error" : "text-ink-muted"}`}>
        {touched && !valid
          ? `Name must be ${NAME_MIN}–${NAME_MAX} characters.`
          : `${clean.length}/${NAME_MAX} · letters, numbers and spaces.`}
      </p>

      <button
        type="button"
        disabled={!valid}
        onClick={() => onSubmit({ name: clean, avatar })}
        className="btn btn-play mt-4 min-h-12 w-full text-lg"
      >
        {submitLabel}
      </button>
    </div>
  );
}
