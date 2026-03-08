"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const LOGGING = process.env.LOGGING == "1";
const log = (type, source, message) => {
    if (!LOGGING)
        return;
    console.log(`\x1b[33m${new Date().toLocaleString()}\x1b[0m: [\x1b[36m${source} ${type}\x1b[0m] ${message}`);
};
exports.log = log;
