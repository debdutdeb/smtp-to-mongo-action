import { SMTPServer } from 'smtp-server';

import { simpleParser } from 'mailparser';

import { isAbsolute, dirname } from 'node:path';
import { mkdir, stat } from 'node:fs/promises';

import { spawn } from 'node:child_process';

import * as fs from 'node:fs';

import { MongoClient } from 'mongodb';

import * as core from '@actions/core';

const inputs = {
	mongoUrl: core.getInput("mongo-url"),
	logFile: core.getInput("log-file"),
	port: parseInt(core.getInput("port") || "2525", 10),
	dbName: core.getInput("database-name") || "tests",
	colName: core.getInput("collection-name") || "emails_received",
}

async function setupLogs(logFile: string) {
	if (!logFile) {
		throw new Error('log-file input is required but not passed');
	}

	if (!isAbsolute(logFile)) {
		throw new Error('log-file must be an absolute path');
	}

	const dir = dirname(logFile);

	const dirStat = await stat(dir);

	if (dirStat.isFile()) {
		throw new Error(`${dir} is not a directory`);
	} else if (!dirStat.isDirectory()) {
		await mkdir(dirname(logFile));
	}


	const stream = fs.createWriteStream(logFile);

	process.stdout.pipe(stream);
	process.stderr.pipe(stream);
}

(async function() {
	if (process.env.SKIP_SPAWN !== 'true') {
		spawn(process.execPath, [process.execPath, __filename], {
			env: {
				SKIP_SPAWN: "true",
			},
			stdio: 'inherit',
			detached: true,
		});

		process.exit(0);
	}

	await setupLogs(inputs.logFile);

	const client = await new MongoClient(inputs.mongoUrl).connect();

	const col = client.db(inputs.dbName).collection(inputs.colName);

	const server = new SMTPServer({
		secure: false,
		name: 'ci',
		authOptional: true,
		allowInsecureAuth: true,

		async onData(stream, session, callback) {
			stream.on('end', callback);

			await col.insertOne(await simpleParser(stream));
		},
	});

	server.listen(inputs.port, () => console.log("SMTP server started ..."));
})();



