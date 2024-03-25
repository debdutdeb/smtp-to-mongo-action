"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const smtp_server_1 = require("smtp-server");
const mailparser_1 = require("mailparser");
const node_path_1 = require("node:path");
const promises_1 = require("node:fs/promises");
const node_child_process_1 = require("node:child_process");
const fs = __importStar(require("node:fs"));
const mongodb_1 = require("mongodb");
const core = __importStar(require("@actions/core"));
const inputs = {
    mongoUrl: process.env.MONGO_URL || core.getInput("mongo-url"),
    logFile: process.env.LOG_FILE || core.getInput("log-file"),
    port: parseInt(process.env.PORT || core.getInput("port") || "2525", 10),
    dbName: process.env.DATABASE_NAME || core.getInput("database-name") || "tests",
    colName: process.env.COLLECTION_NAME || core.getInput("collection-name") || "emails_received",
};
function setupLogs(logFile) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!logFile) {
            throw new Error('log-file input is required but not passed');
        }
        if (!(0, node_path_1.isAbsolute)(logFile)) {
            throw new Error('log-file must be an absolute path');
        }
        const dir = (0, node_path_1.dirname)(logFile);
        const dirStat = yield (0, promises_1.stat)(dir);
        if (dirStat.isFile()) {
            throw new Error(`${dir} is not a directory`);
        }
        else if (!dirStat.isDirectory()) {
            yield (0, promises_1.mkdir)((0, node_path_1.dirname)(logFile));
        }
        const stream = fs.createWriteStream(logFile);
        process.on('uncaughtException', (err) => { var _a; return stream.write((_a = err === null || err === void 0 ? void 0 : err.stack) !== null && _a !== void 0 ? _a : err); });
    });
}
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.env.SKIP_SPAWN !== 'true') {
            (0, node_child_process_1.spawn)(process.execPath, [__filename], {
                env: {
                    SKIP_SPAWN: "true",
                    MONGO_URL: inputs.mongoUrl,
                    DATABASE_NAME: inputs.dbName,
                    COLLECTION_NAME: inputs.colName,
                    LOG_FILE: inputs.logFile,
                    PORT: String(inputs.port),
                },
                stdio: 'inherit',
                detached: true,
            });
            process.exit(0);
        }
        console.log(inputs);
        yield setupLogs(inputs.logFile);
        const client = yield new mongodb_1.MongoClient(inputs.mongoUrl).connect();
        const col = client.db(inputs.dbName).collection(inputs.colName);
        const server = new smtp_server_1.SMTPServer({
            secure: false,
            name: 'ci',
            authOptional: true,
            allowInsecureAuth: true,
            onData(stream, session, callback) {
                return __awaiter(this, void 0, void 0, function* () {
                    stream.on('end', callback);
                    yield col.insertOne(yield (0, mailparser_1.simpleParser)(stream));
                });
            },
        });
        server.listen(inputs.port, () => console.log("SMTP server started ..."));
    });
})();
