import type { Logger } from "@logtape/logtape";

import { describe, it, afterEach } from "@std/testing/bdd";
import { spy, assertSpyCalls, } from "@std/testing/mock";

import { expect } from "@libs/testing";
import { createLogger } from './mod.ts'; // Adjust the import based on your file structure

describe('Logger Library', () => {
  const mockLogger = {
    error: spy(() => { }),
    warn: spy(() => { }),
    info: spy(() => { }),
    debug: spy(() => { }),
    fatal: spy(() => { }),
  };

  const loggers = {
    general: mockLogger as unknown as Logger,
    init: mockLogger as unknown as Logger,
    build: mockLogger as unknown as Logger,
    customLogger: mockLogger as unknown as Logger,
  };

  afterEach(() => {
    // Reset mock call history
    // mockLogger.error.restore();
    // mockLogger.warn.restore();
    // mockLogger.info.restore();
    // mockLogger.debug.restore();
    // mockLogger.fatal.restore();
  });


  describe('Basic Logging Operations', () => {
    it('should log to the general logger by default', () => {
      const logger = createLogger({ loggers });
      logger.info`General Log ${5}`;
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual([
        ['General Log ', ''],
        5,
      ]);
    });

    it('should log to a specific custom logger', () => {
      const logger = createLogger({ loggers });
      logger.init.error('Initialization failed');
      assertSpyCalls(mockLogger.error, 1);
      expect(mockLogger.error.calls[0].args).toEqual(['Initialization failed', {}]);
    });

    it('should log to a specific custom logger (using tagged templates)', () => {
      const logger = createLogger({ loggers });
      logger.init.error`Initialization failed: ${'test'}`;
      assertSpyCalls(mockLogger.error, 1);
      expect(mockLogger.error.calls[0].args).toEqual([
        ['Initialization failed: ', ''],
        'test'
      ]);
    });

    it('should log with various log levels', () => {
      const logger = createLogger({ loggers });
      logger.warn('A warning message');
      logger.debug('Debugging message');
      logger.fatal('A fatal message');
      assertSpyCalls(mockLogger.warn, 1);
      expect(mockLogger.warn.calls[0].args).toEqual(['A warning message', {}]);
      assertSpyCalls(mockLogger.debug, 1);
      expect(mockLogger.debug.calls[0].args).toEqual(['Debugging message', {}]);
      assertSpyCalls(mockLogger.fatal, 1);
      expect(mockLogger.fatal.calls[0].args).toEqual(['A fatal message', {}]);
    });

    it('should log with various log levels (using tagged templates)', () => {
      const logger = createLogger({ loggers });
      logger.warn`A warning message: ${'something'}`;
      logger.debug`Debugging message: ${42}`;
      logger.fatal`A fatal message: ${new Error('error')}`;
      assertSpyCalls(mockLogger.warn, 1);
      expect(mockLogger.warn.calls[0].args).toEqual([
        ['A warning message: ', ''],
        'something'
      ]);
      assertSpyCalls(mockLogger.debug, 1);
      expect(mockLogger.debug.calls[0].args).toEqual([
        ['Debugging message: ', ''],
        42
      ]);
      assertSpyCalls(mockLogger.fatal, 1);
      expect(mockLogger.fatal.calls[0].args).toEqual([
        ['A fatal message: ', ''],
        new Error('error')
      ]);
    });
  });

  describe('Logger Initialization', () => {
    it('should initialize with default options', () => {
      const logger = createLogger({});
      expect(logger.general).toBeUndefined();  // General logger is undefined by default
    });

    it('should initialize with a custom template', () => {
      const logger = createLogger({ loggers, template: 'Custom Template' });
      logger.info('Logging with custom template');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['Logging with custom template', {}]);
    });

    it('should initialize with context data', () => {
      const context = { user: 'testUser' };
      const logger = createLogger({ loggers, context });
      logger.info('Logging with context');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['Logging with context', context]);
    });

    it('should initialize with multiple custom loggers', () => {
      const logger = createLogger({ loggers });
      expect(logger.init).toBe(mockLogger);
      expect(logger.build).toBe(mockLogger);
      expect(logger.customLogger).toBe(mockLogger);
    });
  });

  describe('Logger Methods', () => {
    it('should modify logger options dynamically using with()', () => {
      const logger = createLogger({ loggers });
      logger.with({ logger: 'build', template: 'Building...' }).info('Starting build');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['Starting build', {}]);
    });

    it('should add context data using value()', () => {
      const logger = createLogger({ loggers });
      logger.context({ requestId: '12345' }).info('Request received');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['Request received', { requestId: '12345' }]);
    });

    it('should dynamically create getters for custom loggers', () => {
      const logger = createLogger({ loggers });
      expect(logger.init).toBe(mockLogger);
      expect(logger.build).toBe(mockLogger);
    });

    it('should switch to a custom logger dynamically (using tagged template)', () => {
      const logger = createLogger({ loggers });
      logger.init.info`Initialization log: ${'init'}`;
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual([
        ['Initialization log: ', ''],
        'init'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should throw an error for a non-existent logger', () => {
      const logger = createLogger({ loggers });
      // @ts-expect-error nonExistentLogger
      expect(() => logger.with({ logger: 'nonExistentLogger' }).info('This should fail')).toThrow('Logger "nonExistentLogger" is not registered.');
    });

    it('should throw an error if the logger option is provided in with() and it does not exist', () => {
      const logger = createLogger({ loggers });
      // @ts-expect-error nonExistentLogger
      expect(() => logger.with({ logger: 'nonExistentLogger' })).toThrow('Logger "nonExistentLogger" is not registered.');
    });
  });

  describe('Log Message Formatting', () => {
    it('should log a simple string message', () => {
      const logger = createLogger({ loggers });
      logger.info('Simple log message');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['Simple log message', {}]);
    });

    it('should log a message with template strings and values', () => {
      const logger = createLogger({ loggers });
      logger.info`Template Log ${5}`;
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual([
        ['Template Log ', ''],
        5
      ]);
    });

    it('should log a message with a callback function', () => {
      const logger = createLogger({ loggers });
      const callback = (prefix: (msg: TemplateStringsArray, ...vals: unknown[]) => unknown[]) => prefix`Callback Log ${5}`;
      logger.info(callback);
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual([callback]);
    });

    it('should log a message with a context object', () => {
      const logger = createLogger({ loggers });
      logger.info({ userId: 'abc123' });
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual([{ userId: 'abc123' }]);
    });

    it('should merge context data from log call with existing context', () => {
      const logger = createLogger({ loggers, context: { user: 'testUser' } });
      logger.info({ requestId: 'abc123' });
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual([{ user: 'testUser', requestId: 'abc123' }]);
    });

    it('should use the provided template for logging', () => {
      const logger = createLogger({ loggers, template: 'Custom Template' });
      logger.info('Template provided');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['Template provided', {}]);
    });

    it('should log with an empty message', () => {
      const logger = createLogger({ loggers });
      logger.info('');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['', {}]);
    });

    it('should handle undefined values in the message template', () => {
      const logger = createLogger({ loggers });
      logger.info`Value is ${undefined}`;
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual([
        ['Value is ', ''],
        undefined
      ]);
    });

    it('should log with a default message if only context is provided', () => {
      const logger = createLogger({ loggers });
      logger.info({ key: 'value' });
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual([{ key: 'value' }]);
    });
  });

  describe('Integration with LogTapeLogger', () => {
    it('should call the correct logger based on the log level', () => {
      const logger = createLogger({ loggers });
      logger.error('Error message');
      logger.warn('Warning message');
      logger.debug('Debug message');
      logger.fatal('Fatal message');
      assertSpyCalls(mockLogger.error, 1);
      expect(mockLogger.error.calls[0].args).toEqual(['Error message', {}]);
      assertSpyCalls(mockLogger.warn, 1);
      expect(mockLogger.warn.calls[0].args).toEqual(['Warning message', {}]);
      assertSpyCalls(mockLogger.debug, 1);
      expect(mockLogger.debug.calls[0].args).toEqual(['Debug message', {}]);
      assertSpyCalls(mockLogger.fatal, 1);
      expect(mockLogger.fatal.calls[0].args).toEqual(['Fatal message', {}]);
    });

    it('should ensure log level functions are called with correct message and context', () => {
      const logger = createLogger({ loggers, context: { sessionId: '123' } });
      logger.warn('This is a warning');
      assertSpyCalls(mockLogger.warn, 1);
      expect(mockLogger.warn.calls[0].args).toEqual(['This is a warning', { sessionId: '123' }]);
    });

    it('should allow switching between loggers dynamically', () => {
      const logger = createLogger({ loggers });
      logger.init.info('Initializing...');
      logger.build.debug('Building...');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['Initializing...', {}]);
      assertSpyCalls(mockLogger.debug, 1);
      expect(mockLogger.debug.calls[0].args).toEqual(['Building...', {}]);
    });

    it('should call the correct logger getter based on dynamic switching', () => {
      const logger = createLogger({ loggers });
      logger.init.info('Switched to init logger');
      assertSpyCalls(mockLogger.info, 1);
      expect(mockLogger.info.calls[0].args).toEqual(['Switched to init logger', {}]);
      logger.build.warn('Switched to build logger');
      assertSpyCalls(mockLogger.warn, 1);
      expect(mockLogger.warn.calls[0].args).toEqual(['Switched to build logger', {}]);
    });

    it('should catch TypeScript errors for incorrect log level usage', () => {
      const logger = createLogger({ loggers });
      expect(() => {
        // Attempt to use a non-existent log level should trigger a TypeScript error
        // @ts-expect-error nonExistentLogger
        logger.init.verbose('This should fail');
      }).toThrow('logger.init.verbose is not a function');
    });
  });
});
