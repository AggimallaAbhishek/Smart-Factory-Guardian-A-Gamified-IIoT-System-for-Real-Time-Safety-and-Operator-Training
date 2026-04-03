import { ReadlineParser } from "@serialport/parser-readline";
import { SerialPort } from "serialport";
import type { Logger } from "../logger.js";
import type { FrameSource, FrameSourceCallbacks } from "./types.js";

export interface SerialSourceOptions extends FrameSourceCallbacks {
  path: string;
  baudRate: number;
  logger: Logger;
}

export class SerialSource implements FrameSource {
  readonly type = "serial" as const;
  private port: SerialPort | null = null;
  private errorHandler: ((error: Error) => void) | null = null;
  private parser: ReadlineParser | null = null;

  constructor(private readonly options: SerialSourceOptions) {}

  async start() {
    this.options.logger.info("Opening serial source", {
      path: this.options.path,
      baudRate: this.options.baudRate
    });

    this.port = new SerialPort({
      path: this.options.path,
      baudRate: this.options.baudRate,
      autoOpen: false
    });

    await new Promise<void>((resolve, reject) => {
      this.port?.open((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.errorHandler = (error: Error) => {
      this.options.logger.error("Serial source error", {
        message: error.message
      });
      this.options.onError(error);
    };

    this.port.on("error", this.errorHandler);

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: "\n" }));
    this.parser.on("data", (line: string) => {
      const normalized = line.trim();
      if (!normalized) {
        return;
      }

      this.options.logger.debug("Serial frame received", {
        line: normalized
      });

      this.options.onFrame(normalized);
    });
  }

  async stop() {
    if (!this.port) {
      return;
    }

    this.options.logger.info("Closing serial source", {
      path: this.options.path
    });

    const port = this.port;
    this.port = null;

    // Remove event listeners to prevent memory leaks
    if (this.errorHandler) {
      port.removeListener("error", this.errorHandler);
      this.errorHandler = null;
    }

    if (this.parser) {
      this.parser.removeAllListeners("data");
      this.parser = null;
    }

    if (!port.isOpen) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      port.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  sendCommand(command: string) {
    if (!this.port || !this.port.isOpen) {
      this.options.logger.warn("Cannot send command, serial port not open", { command });
      return false;
    }

    const commandWithNewline = command + '\n';
    this.port.write(commandWithNewline, (error) => {
      if (error) {
        this.options.logger.error("Failed to send command to Arduino", {
          command,
          error: error.message
        });
      } else {
        this.options.logger.debug("Command sent to Arduino", { command });
      }
    });

    return true;
  }
}
