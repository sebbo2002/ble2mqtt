'use strict';

const SMART_TIMEOUT_SLOT_SIZE = 25;

class SmartWatchdog {
    constructor () {
        this.reset();
    }

    tick () {
        const t = new Date().getTime();
        if (!this.smartTimeoutCounterReset) {
            this.smartTimeoutCounterReset = t;
        }

        this.smartTimeoutCounter++;
        if (this.smartTimeoutCounter >= SMART_TIMEOUT_SLOT_SIZE) {
            this.smartTimeoutMemory.push(Math.ceil(t - this.smartTimeoutCounterReset));
            this.smartTimeoutCounter = 0;
            this.smartTimeoutCounterReset = t;
        }
        if (this.smartTimeoutMemory.length > 2) {
            const first = this.smartTimeoutMemory.shift();
            if (!this.timeout || this.timeout < first) {
                this.timeout = first;
            }
        }

        this.handlerPointer = 0;

        if (this.watchdog) {
            clearTimeout(this.watchdog);
        }
        if (this.timeout) {
            this.watchdog = setTimeout(() => this.check(), this.timeout);
        }
    }

    check () {
        this.smartTimeoutMemory = [];
        this.smartTimeoutCounterReset = null;
        this.smartTimeoutCounter = 0;

        const nextHandlerIndex = this.handler.length > this.handlerPointer ? this.handlerPointer : this.handler - 1;

        const nextHandler = this.handler[nextHandlerIndex];
        const nextWaitingTime = nextHandler();
        this.handlerPointer++;

        this.watchdog = setTimeout(() => this.check(), nextWaitingTime || 30000);
    }

    reset () {
        this.timeout = null;
        this.smartTimeoutMemory = [];
        this.smartTimeoutCounterReset = null;
        this.smartTimeoutCounter = 0;
        this.handler = [];
        this.handlerPointer = 0;
    }

    addHandler (fn) {
        this.handler.push(fn);
    }
}

module.exports = SmartWatchdog;
