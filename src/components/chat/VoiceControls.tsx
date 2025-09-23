import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleSpeech: () => void;
  isListening: boolean;
  isSpeechEnabled: boolean;
  isSupported: boolean;
}

export const VoiceControls = ({
  onStartListening,
  onStopListening,
  onToggleSpeech,
  isListening,
  isSpeechEnabled,
  isSupported
}: VoiceControlsProps) => {
  const [voiceLevel, setVoiceLevel] = useState(0);

  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setVoiceLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setVoiceLevel(0);
    }
  }, [isListening]);

  if (!isSupported) {
    return (
      <div className="text-center p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Voice features are not supported in your browser
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
      <Button
        variant={isListening ? "voice" : "voice-inactive"}
        size="icon"
        onClick={isListening ? onStopListening : onStartListening}
        className={cn(
          "relative overflow-hidden",
          isListening && "animate-pulse-gentle"
        )}
      >
        {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        {isListening && (
          <div className="absolute inset-0 bg-voice-active/20 animate-pulse" />
        )}
      </Button>

      {isListening && (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 bg-voice-active rounded-full transition-all duration-100",
                voiceLevel > i * 20 ? "h-6 animate-voice-wave" : "h-2"
              )}
              style={{
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      )}

      <div className="h-6 w-px bg-border" />

      <Button
        variant={isSpeechEnabled ? "voice" : "ghost"}
        size="icon"
        onClick={onToggleSpeech}
      >
        {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </Button>

      <div className="text-sm text-muted-foreground">
        {isListening ? "Listening..." : "Click to speak"}
      </div>
    </div>
  );
};