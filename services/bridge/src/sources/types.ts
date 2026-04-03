import type { SourceType } from "@guardian/protocol";

export interface FrameSource {
  readonly type: SourceType;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  sendCommand?: (command: string) => boolean;
}

export interface FrameSourceCallbacks {
  onFrame: (line: string) => void;
  onError: (error: Error) => void;
}
