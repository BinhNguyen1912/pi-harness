import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Optional, Type } from "typebox";
import { agentDir } from "../lib/agent-dir.js";

/**
 * hive — the Hive AI task API as one tool.
 *
 * Hive is a classification service, not a chat model: a task returns, per
 * media frame or text span, the project's classes with scores (moderation,
 * AI-generated detection, logos, …). The project — and therefore the model
 * behind those classes — is chosen by the API key, so this extension sends no
 * model name; passing one is a mistake the API would not honour.
 *
 * Contract (docs.thehive.ai): submit with `POST /api/v2/task/sync` (keeps the
 * request open, returns the finished task) or `/api/v2/task/async` (returns a
 * `task_id`), then read a task back with `GET /api/v1/task?task_id=`. The body
 * is multipart with exactly one of `url`, `media` (a file), `text_data`; the
 * key rides in the header `authorization: token <API_KEY>`.
 *
 * The key is never written into a repository: `HIVE_API_KEY` wins, else the
 * first line of `<agent dir>/hive-key` (pi's user directory, outside every
 * checkout).
 */

const BASE_URL = "https://api.thehive.ai/api";
const KEY_ENV = "HIVE_API_KEY";
const KEY_FILE = "hive-key";
const DEFAULT_TIMEOUT_S = 120;
/** A long video task can answer with thousands of frames; keep the tool result readable. */
const MAX_TEXT = 30_000;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class HiveError extends Error {}

function firstLine(text: string): string {
	const line = text.split("\n")[0] ?? "";
	return line.length > 300 ? `${line.slice(0, 300)}…` : line;
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function isFinished(task: unknown): boolean {
	const record = asRecord(task);
	return record.progress === "completed" || record.state === "finished";
}

/** `HIVE_API_KEY`, else the first line of `<agent dir>/hive-key`; a message that names both when neither exists. */
export function readToken(env: NodeJS.ProcessEnv, readText: (path: string) => string, home: string | undefined = undefined): string {
	const fromEnv = env[KEY_ENV]?.trim();
	if (fromEnv) return fromEnv;
	const path = join(home ?? agentDir(env), KEY_FILE);
	let raw = "";
	try {
		raw = readText(path);
	} catch {
		raw = "";
	}
	const fromFile = (raw.split("\n")[0] ?? "").trim();
	if (fromFile) return fromFile;
	throw new HiveError(`no Hive API key: set ${KEY_ENV}, or write the key as the first line of ${path}`);
}

export type HiveInput = { url?: string; file?: string; text?: string };

export type HiveClient = {
	sync(input: HiveInput): Promise<unknown>;
	async(input: HiveInput): Promise<unknown>;
	status(taskId: string, waitS?: number): Promise<unknown>;
};

export function createHive(options: {
	token: string;
	baseUrl?: string;
	timeoutS?: number;
	fetchImpl?: FetchLike;
	readFileImpl?: (path: string) => Promise<Uint8Array>;
	sleep?: (ms: number) => Promise<void>;
}): HiveClient {
	const baseUrl = options.baseUrl ?? BASE_URL;
	const timeoutS = options.timeoutS ?? DEFAULT_TIMEOUT_S;
	const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
	const readFileImpl = options.readFileImpl ?? ((path: string) => readFile(path));
	const sleep = options.sleep ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
	const headers = { authorization: `token ${options.token}`, accept: "application/json" };

	async function body(input: HiveInput): Promise<FormData> {
		const given = [input.url, input.file, input.text].filter((value) => value !== undefined && value !== "");
		if (given.length !== 1) throw new HiveError("give exactly one of url, file, or text (Hive accepts one of url / media / text_data)");
		const form = new FormData();
		if (input.url !== undefined && input.url !== "") form.append("url", input.url);
		else if (input.text !== undefined && input.text !== "") form.append("text_data", input.text);
		else if (input.file !== undefined && input.file !== "")
			form.append("media", new Blob([new Uint8Array(await readFileImpl(input.file))]), basename(input.file));
		return form;
	}

	async function json(what: string, response: Response): Promise<unknown> {
		const text = await response.text();
		if (!response.ok) throw new HiveError(`${what} failed: HTTP ${response.status} ${firstLine(text)}`);
		try {
			return JSON.parse(text) as unknown;
		} catch {
			throw new HiveError(`${what} answered with non-JSON: ${firstLine(text)}`);
		}
	}

	async function submit(kind: "sync" | "async", input: HiveInput): Promise<unknown> {
		const response = await fetchImpl(`${baseUrl}/v2/task/${kind}`, {
			method: "POST",
			headers,
			body: await body(input),
			signal: AbortSignal.timeout(timeoutS * 1000),
		});
		return json(`Hive ${kind}`, response);
	}

	return {
		sync: (input) => submit("sync", input),
		async: (input) => submit("async", input),
		async status(taskId, waitS = 0) {
			const deadline = Date.now() + Math.max(0, waitS) * 1000;
			for (;;) {
				const response = await fetchImpl(`${baseUrl}/v1/task?task_id=${encodeURIComponent(taskId)}`, {
					headers,
					signal: AbortSignal.timeout(timeoutS * 1000),
				});
				const task = await json("Hive status", response);
				if (waitS <= 0 || isFinished(task) || Date.now() >= deadline) return task;
				await sleep(3000);
			}
		},
	};
}

function pickInput(params: { url?: string; file?: string; text?: string }): HiveInput {
	const input: HiveInput = {};
	if (params.url !== undefined && params.url !== "") input.url = params.url;
	if (params.file !== undefined && params.file !== "") input.file = params.file;
	if (params.text !== undefined && params.text !== "") input.text = params.text;
	return input;
}

function render(value: unknown): string {
	const text = JSON.stringify(value, null, 2) ?? String(value);
	if (text.length <= MAX_TEXT) return text;
	return `${text.slice(0, MAX_TEXT)}\n… ${text.length - MAX_TEXT} characters omitted (the response is capped; a long video returns one entry per frame)`;
}

const hiveSchema = Type.Object({
	op: Type.Union([Type.Literal("sync"), Type.Literal("async"), Type.Literal("status")], {
		description: "sync: submit and wait for the finished task; async: submit and return a task_id; status: read a task by taskId.",
	}),
	url: Optional(Type.String({ description: "Public URL Hive downloads (url field). One of url, file, or text." })),
	file: Optional(Type.String({ description: "Local path uploaded as media. One of url, file, or text." })),
	text: Optional(Type.String({ description: "Raw text to classify (text_data field). One of url, file, or text." })),
	taskId: Optional(Type.String({ description: "Task id to read (op status); the id an async submit answered with." })),
	waitS: Optional(Type.Number({ description: "op status: keep polling up to this many seconds (default 0: one read). Polls every 3 s." })),
	timeoutS: Optional(Type.Number({ description: `Per-request HTTP timeout in seconds (default ${DEFAULT_TIMEOUT_S}).` })),
});

export type HiveParams = {
	op: "sync" | "async" | "status";
	url?: string;
	file?: string;
	text?: string;
	taskId?: string;
	waitS?: number;
	timeoutS?: number;
};

export default function hive(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "hive",
		label: "Hive AI",
		description:
			"Classify media or text through the Hive AI task API (content moderation, AI-generated detection, custom classes), using the classes of the project the API key belongs to. op sync waits for the finished task; op async returns a task_id to read later with op status. Send exactly one of url (Hive downloads it), file (uploaded as multipart media), or text (text_data).",
		promptSnippet: "Classify an image, video, or text through the Hive AI task API, using the project's own classes.",
		promptGuidelines: [
			"Send one input per task: url, file, or text — Hive rejects a body with two.",
			"Async submits answer with a task_id only; read the result with op status (waitS for long media) instead of resubmitting, which charges the project again.",
			"The key comes from HIVE_API_KEY or the first line of <agent dir>/hive-key; never write a key into a repository.",
		],
		parameters: hiveSchema,
		async execute(_toolCallId: string, params: HiveParams) {
			try {
				const taskId = params.op === "status" ? params.taskId : undefined;
				if (params.op === "status" && (taskId === undefined || taskId === "")) throw new HiveError("op status needs taskId");
				const token = readToken(process.env, (path) => readFileSync(path, "utf8"));
				const client = createHive({ token, ...(params.timeoutS === undefined ? {} : { timeoutS: params.timeoutS }) });
				if (taskId !== undefined) {
					const task = await client.status(taskId, params.waitS);
					return { content: [{ type: "text" as const, text: render(task) }], details: { hive: "status" } };
				}
				const input = pickInput(params);
				const result = params.op === "sync" ? await client.sync(input) : await client.async(input);
				return { content: [{ type: "text" as const, text: render(result) }], details: { hive: params.op } };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return { content: [{ type: "text" as const, text: `hive: ${message}` }], details: { hive: "error" } };
			}
		},
	});
}
