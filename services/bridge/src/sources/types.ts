import type { SourceType } from "@guardian/protocol";

export interface FrameSource {
  readonly type: SourceType;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface FrameSourceCallbacks {
  onFrame: (line: string) => void;
  onError: (error: Error) => void;
}
