"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FacingMode = "user" | "environment";

export function useCameraRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [facing, setFacing] = useState<FacingMode>("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const startCamera = useCallback(async (mode: FacingMode) => {
    setError(null);
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorchSupported(!!caps?.torch);
      setReady(true);
    } catch {
      setError("Camera access isn't available. You can upload a video instead.");
      setReady(false);
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const flip = useCallback(() => setFacing((f) => (f === "user" ? "environment" : "user")), []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // torch control isn't available on this device/browser — no-op
    }
  }, [torchOn, torchSupported]);

  function pickMimeType() {
    const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
    }
    return "video/webm";
  }

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: pickMimeType() });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(200);
    recorderRef.current = recorder;
    setRecording(true);
    setPaused(false);
  }, []);

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pause();
    setPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resume();
    setPaused(false);
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) return resolve(null);
      recorder.onstop = () => {
        setRecording(false);
        setPaused(false);
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" }));
      };
      recorder.stop();
    });
  }, []);

  return {
    videoRef,
    ready,
    error,
    facing,
    flip,
    recording,
    paused,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    torchSupported,
    torchOn,
    toggleTorch,
    retry: () => startCamera(facing),
  };
}
