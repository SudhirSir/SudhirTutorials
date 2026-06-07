import { EventEmitter } from 'events';

// Prevent multiple instances of EventEmitter in development
const globalForEvents = globalThis as unknown as {
  messageEmitter: EventEmitter;
};

export const messageEmitter =
  globalForEvents.messageEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.messageEmitter = messageEmitter;
}

// Increase max listeners since many clients might be connected simultaneously
messageEmitter.setMaxListeners(200);
