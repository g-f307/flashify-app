"use client";

import { useEffect } from "react";

import { captureAcquisitionContext } from "@/lib/acquisition";

export default function AcquisitionTracker() {
  useEffect(() => {
    captureAcquisitionContext();
  }, []);

  return null;
}
