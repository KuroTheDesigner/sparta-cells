"use client";

import { useState } from "react";
import type { PhoneEvidence } from "@/lib/ai/types";

export function PhoneImage({
  evidence,
  name,
}: {
  evidence?: PhoneEvidence;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = evidence?.imageUrl;
  if (!url || !evidence?.imageSource || failed)
    return (
      <div className="sc-phone-photo sc-phone-photo-empty">
        <span>Photo unavailable</span>
        <small>Exact model only</small>
      </div>
    );
  return (
    <figure className="sc-phone-photo">
      {/* The resolver validates the exact model and remote host; images stay on their source CDN. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      <figcaption>
        <a href={evidence.imageSource.url} target="_blank" rel="noreferrer">
          Photo source
        </a>
      </figcaption>
    </figure>
  );
}
