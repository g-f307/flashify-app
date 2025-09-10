// front/components/common/time-ago.tsx
"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Props = { date?: string | Date; intervalMs?: number };

export default function TimeAgo({ date, intervalMs = 60_000 }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  if (!date) return <span>—</span>;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return <span>—</span>;

  return <span>{formatDistanceToNow(d, { addSuffix: true, locale: ptBR })}</span>;
}
