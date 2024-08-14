import type { LogRecord, Logger as LogTapeLogger, Sink, LogLevel as LogTapeLogLevel } from "@logtape/logtape";
import { getLogger } from "@logtape/logtape";

export const generalLogger = getLogger(["@okikio/logger", "general"]);

/**
 * A logging template prefix function.  It is used to log a message in
 * a {@link LogCallback} function.
 * @param message The message template strings array.
 * @param values The message template values.
 * @returns The rendered message array.
 */
export type LogTemplatePrefix = (
  message: TemplateStringsArray,
  ...values: unknown[]
) => unknown[];

/**
 * A logging callback function.  It is used to defer the computation of a
 * message template until it is actually logged.
 * @param prefix The message template prefix.
 * @returns The rendered message array.
 */
export type LogCallback = (prefix: LogTemplatePrefix) => unknown[];
export type LogLevel = LogTapeLogLevel;

export interface LogTapeLoggerImpl extends LogTapeLogger {
  emit(record: LogRecord, bypassSinks?: Set<Sink>): void;
  log(
    level: LogLevel,
    message: string,
    properties: Record<string, unknown> | (() => Record<string, unknown>),
    bypassSinks?: Set<Sink>,
  ): void;
}

export interface LoggerOptions<L extends string> {
  logger?: L;
  template?: unknown;
  context?: Record<string, unknown>;
  loggers?: Record<L, LogTapeLogger>; // Custom loggers passed as name-logger pairs
}

export class Logger<L extends string = "general"> {
  #loggers: Record<L | "general", LogTapeLogger>;
  #currentLogger: L | "general";
  #message?: unknown;
  #context: Record<string, unknown>;

  constructor(options: LoggerOptions<L> = {} as LoggerOptions<L>) {
    const {
      logger = "general" as L,
      template,
      context = {},
      loggers = {},
    } = options;
    this.#loggers = { general: generalLogger } as Record<L | "general", LogTapeLogger>;
    this.#message = template;
    this.#context = context;
    this.#currentLogger = logger;

    // Dynamically create getters for custom loggers
    for (const [name, _logger] of Object.entries<LogTapeLogger>(loggers)) {
      this.#loggers[name as L] = _logger;
      this.#createLoggerGetter(name as L);
    }
  }

  #createLoggerGetter(name: L): void {
    Object.defineProperty(this, name, {
      get() {
        this.#currentLogger = name;
        return this;
      },
      configurable: true,
      enumerable: true,
    });
  }

  with(options: LoggerOptions<L> = {}): this {
    if (options.logger) {
      this.#currentLogger = options.logger;
      if (!this.#loggers[options.logger]) {
        throw new Error(`Logger "${options.logger}" is not registered.`);
      }
    }
    if (options.template) this.#message = options.template;
    if (options.context) {
      Object.assign(this.#context, options.context);
    }
    return this;
  }

  getLogger() { return this.#loggers[this.#currentLogger]; }
  #log(level: LogLevel, _message: unknown, ...args: unknown[]): void {
    const logger = this.#loggers[this.#currentLogger] as LogTapeLoggerImpl;
    const context = structuredClone(this.#context);

    let message = _message ?? this.#message ?? _message;
    if (typeof _message === "string") {
      const possibleArg = typeof args[0] === "function" ? args[0]?.(context) : args[0];
      if (possibleArg) Object.assign(context, (possibleArg ?? {}) as Record<string, unknown>);
      logger.log(level, message, (context ?? {}) as Record<string, unknown>, args[1] as Set<Sink>);
    }

    // if (typeof message === "string" ) {
    //   const possibleArg = typeof args[0] === "function" ? args[0]?.(context) : args[0];
    //   if (possibleArg) Object.assign(context, (possibleArg ?? {}) as Record<string, unknown>);
    //   logger.log(level, message, (context ?? {}) as Record<string, unknown>, args[1] as Set<Sink>);
    // } else if (typeof template === "object" && !Array.isArray(template)) {
    //   message = this.#message || "Log message"; // Default message if no template is provided
    //   Object.assign(context, template as Record<string, unknown>);

    //   const possibleArg = typeof args[0] === "function" ? args[0]?.(context) : args[0];
    //   if (possibleArg) Object.assign(context, (possibleArg ?? {}) as Record<string, unknown>);
    //   logger[level](message, context);
    // } else {
    //   logger[level](template as TemplateStringsArray, ...args);
    // }
  }

  #logLazily(
    level: LogLevel,
    callback: LogCallback,
    properties: Record<string, unknown> | (() => Record<string, unknown>) = {},
    bypassSinks?: Set<Sink>,
  ): void {
    const logger = this.#loggers[this.#currentLogger] as LogTapeLoggerImpl;
    let msg: unknown[] | undefined = undefined;
    const record: LogRecord = {
      category: logger.category,
      level,
      get message() {
        if (msg == null) {
          msg = callback((tpl, ...values) => renderMessage(tpl, values));
        }
        return msg;
      },
      timestamp: Date.now(),
      properties: {},
    };

    let cachedProps: Record<string, unknown> | undefined = undefined;
    Object.assign(record, typeof properties === "function" ? {
      get properties() {
        if (cachedProps == null) cachedProps = properties();
        return cachedProps;
      },
    } : { properties });
    logger.emit(record, bypassSinks);
  }

  #logTemplate(
    level: LogLevel,
    messageTemplate: TemplateStringsArray,
    values: unknown[],
    properties: Record<string, unknown> | (() => Record<string, unknown>) = {},
    bypassSinks?: Set<Sink>,
  ): void {
    const logger = this.#loggers[this.#currentLogger] as LogTapeLoggerImpl;
    const record: LogRecord = {
      category: logger.category,
      level,
      message: renderMessage(messageTemplate, values),
      timestamp: Date.now(),
      properties: {},
    };

    let cachedProps: Record<string, unknown> | undefined = undefined;
    Object.assign(record, typeof properties === "function" ? {
      get properties() {
        if (cachedProps == null) cachedProps = properties();
        return cachedProps;
      },
    } : { properties });
    logger.emit(record, bypassSinks);
  }

  error(templateOrContext: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...args: unknown[]) {
    this.#log("error", templateOrContext, ...args);
    return this;
  }

  warn(templateOrContext: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...args: unknown[]) {
    this.#log("warn", templateOrContext, ...args);
    return this;
  }

  info(templateOrContext: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...args: unknown[]) {
    this.#log("info", templateOrContext, ...args);
    return this;
  }

  debug(templateOrContext: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...args: unknown[]) {
    this.#log("debug", templateOrContext, ...args);
    return this;
  }

  fatal(templateOrContext: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...args: unknown[]) {
    this.#log("fatal", templateOrContext, ...args);
    return this;
  }

  context(context: Record<string, unknown>): this {
    Object.assign(this.#context, context);
    return this;
  }

  message(message: unknown): this {
    this.#message = message;
    return this;
  }

  // Shortcut for general logger
  get general(): this {
    this.#currentLogger = "general";
    return this;
  }
}

// Interface to extend Logger with custom loggers
export type LoggerWithCustomLoggers<L extends string> = Logger<L> & {
  [P in L]: Logger<L>;
}

// Function to create a logger with typed custom loggers
export function createLogger<L extends string>(options: LoggerOptions<L> = {}): LoggerWithCustomLoggers<L> {
  return new Logger(options) as LoggerWithCustomLoggers<L>;
}

/**
 * Parse a message template into a message template array and a values array.
 * @param template The message template.
 * @param properties The values to replace placeholders with.
 * @returns The message template array and the values array.
 */
export function parseMessageTemplate(
  template: string,
  properties: Record<string, unknown>,
): readonly unknown[] {
  const message: unknown[] = [];
  let part = "";
  for (let i = 0; i < template.length; i++) {
    const char = template.charAt(i);
    const nextChar = template.charAt(i + 1);

    if (char == "{" && nextChar == "{") {
      // Escaped { character
      part = part + char;
      i++;
    } else if (char == "}" && nextChar == "}") {
      // Escaped } character
      part = part + char;
      i++;
    } else if (char == "{") {
      // Start of a placeholder
      message.push(part);
      part = "";
    } else if (char == "}") {
      // End of a placeholder
      message.push(properties[part]);
      part = "";
    } else {
      // Default case
      part = part + char;
    }
  }
  message.push(part);
  return message;
}

/**
 * Render a message template with values.
 * @param template The message template.
 * @param values The message template values.
 * @returns The message template values interleaved between the substitution
 *          values.
 */
export function renderMessage(
  template: TemplateStringsArray,
  values: readonly unknown[],
): unknown[] {
  const args = [];
  for (let i = 0; i < template.length; i++) {
    args.push(template[i]);
    if (i < values.length) args.push(values[i]);
  }
  return args;
}