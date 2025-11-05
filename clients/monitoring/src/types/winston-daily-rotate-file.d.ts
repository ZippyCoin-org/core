declare module 'winston-daily-rotate-file' {
  import type TransportStream from 'winston-transport';
  class DailyRotateFile extends TransportStream {
    constructor(options?: Record<string, any>);
  }
  export = DailyRotateFile;
}

