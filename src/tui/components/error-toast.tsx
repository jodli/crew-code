import { useEffect, useState } from "react";

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function ErrorToast({ message, onDismiss, durationMs = 4000 }: ErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  if (!message) return null;

  return (
    <box
      position="absolute"
      bottom={2}
      left={4}
      width="60%"
      height={3}
      border
      borderStyle="rounded"
      borderColor="#f7768e"
      backgroundColor="#1a1b26"
      paddingX={1}
      zIndex={20}
    >
      <text content={message} fg="#f7768e" />
    </box>
  );
}
