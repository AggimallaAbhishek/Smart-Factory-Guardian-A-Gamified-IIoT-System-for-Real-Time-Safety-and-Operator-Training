import { buildFirmwareFrame, type AlertType } from "@guardian/protocol";
import type { Logger } from "../logger.js";
import { toError } from "../utils.js";
import type { FrameSource, FrameSourceCallbacks } from "./types.js";

export interface SimulatorSourceOptions extends FrameSourceCallbacks {
  intervalMinMs: number;
  intervalMaxMs: number;
  logger: Logger;
  random?: () => number;
  now?: () => number;
  deterministicSequence?: AlertType[];
}

const FALLBACK_SEQUENCE: AlertType[] = ["gas", "temperature", "maintenance"];

export class SimulatorSource implements FrameSource {
  readonly type = "simulator" as const;
  private readonly random: () => number;
  private readonly now: () => number;
  private timeout: NodeJS.Timeout | null = null;
  private eventCounter = 0;
  private sequenceCursor = 0;

  constructor(private readonly options: SimulatorSourceOptions) {
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
  }

  async start() {
    this.options.logger.info("Starting simulator source", {
      intervalMinMs: this.options.intervalMinMs,
      intervalMaxMs: this.options.intervalMaxMs
    });

    this.scheduleNext();
  }

  async stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    this.options.logger.info("Stopped simulator source", {
      emittedEvents: this.eventCounter
    });
  }

  private scheduleNext() {
    const delay =
      this.options.intervalMinMs +
      Math.floor(this.random() * (this.options.intervalMaxMs - this.options.intervalMinMs + 1));

    this.timeout = setTimeout(() => {
      try {
        this.emitFrame();
      } catch (error) {
        this.options.onError(toError(error));
      }

      this.scheduleNext();
    }, delay);
  }

  private emitFrame() {
    this.eventCounter += 1;

    const alertType = this.pickAlertType();
    const frame = buildFirmwareFrame(`sim-${this.eventCounter}`, alertType, this.now());

    this.options.logger.debug("Simulator frame emitted", {
      frame,
      eventCounter: this.eventCounter
    });

    this.options.onFrame(frame);
  }

  private pickAlertType(): AlertType {
    const sequence = this.options.deterministicSequence ?? FALLBACK_SEQUENCE;
    if (this.options.deterministicSequence && sequence.length > 0) {
      const selected = sequence[this.sequenceCursor % sequence.length] ?? "gas";
      this.sequenceCursor += 1;
      return selected;
    }

    const index = Math.floor(this.random() * FALLBACK_SEQUENCE.length);
    return FALLBACK_SEQUENCE[index] ?? "gas";
  }
}
