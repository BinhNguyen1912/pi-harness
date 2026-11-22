import assert from "node:assert/strict";
import { test } from "node:test";
import hive, { createHive, HiveError, readToken } from "./index.js";

// The Hive contract this extension encodes: multipart submit on /v2/task/{sync,async}
// with `authorization: token <key>` and exactly one of url / media / text_data, then
// `GET /v1/task?task_id=` to read a task back. A fake fetch keeps the suite offline.

type Call = { url: string; init: RequestInit };

function fakeFetch(payload: unknown, status = 200, raw?: string) {
	const calls: Call[] = [];
	const fetchImpl = (url: string, init?: RequestInit): Promise<Response> => {
		calls.push({ url, init: init ?? {} });
		return Promise.resolve(new Response(raw ?? JSON.stringify(payload), { status, headers: { "content-type": "application/json" } }));
	};
	return { calls, fetchImpl };
}

function field(init: RequestInit, name: string): unknown {
	const body = init.body;
	assert.ok(body instanceof FormData, "the submit body is multipart");
	return body.get(name);
}

test("sync posts multipart to /v2/task/sync with the token header and the url field", async () => {
	const { calls, fetchImpl } = fakeFetch({ status: [{ status: { code: "0", message: "SUCCESS" } }] });
	const hive = createHive({ token: "abc==", fetchImpl });
	const result = await hive.sync({ url: "https://example.test/cat.jpg" });

	assert.equal(calls.length, 1);
	const call = calls[0];
	assert.ok(call);
	assert.equal(call.url, "https://api.thehive.ai/api/v2/task/sync");
	assert.equal(call.init.method, "POST");
	assert.deepEqual(call.init.headers, { authorization: "token abc==", accept: "application/json" });
	assert.equal(field(call.init, "url"), "https://example.test/cat.jpg");
	assert.deepEqual(result, { status: [{ status: { code: "0", message: "SUCCESS" } }] });
});

test("async posts to /v2/task/async and answers with the task_id", async () => {
	const { calls, fetchImpl } = fakeFetch({ task_id: "dd52c0d0-9ec7-11ea-98a3-4b92424b8366", status: "queued" });
	const hive = createHive({ token: "k", fetchImpl });
	const result = await hive.async({ text: "hello" });

	const call = calls[0];
	assert.ok(call);
	assert.equal(call.url, "https://api.thehive.ai/api/v2/task/async");
	assert.equal(field(call.init, "text_data"), "hello");
	assert.equal((result as { task_id: string }).task_id, "dd52c0d0-9ec7-11ea-98a3-4b92424b8366");
});

test("a file is uploaded as media with its basename, not read from the network", async () => {
	const { calls, fetchImpl } = fakeFetch({ ok: true });
	const readPaths: string[] = [];
	const hive = createHive({
		token: "k",
		fetchImpl,
		readFileImpl: (path) => {
			readPaths.push(path);
			return Promise.resolve(new Uint8Array([1, 2, 3]));
		},
	});
	await hive.sync({ file: "/tmp/frames/binh2.jpg" });

	assert.deepEqual(readPaths, ["/tmp/frames/binh2.jpg"]);
	const call = calls[0];
	assert.ok(call);
	const media = field(call.init, "media");
	assert.ok(media instanceof File, "media is a File so the filename travels with the bytes");
	assert.equal(media.name, "binh2.jpg");
	assert.equal(field(call.init, "url"), null);
});

test("status reads GET /v1/task with the task_id in the query", async () => {
	const { calls, fetchImpl } = fakeFetch({ progress: "completed", state: "finished" });
	const hive = createHive({ token: "k", fetchImpl });
	await hive.status("abc-123");

	const call = calls[0];
	assert.ok(call);
	assert.equal(call.url, "https://api.thehive.ai/api/v1/task?task_id=abc-123");
	assert.equal(call.init.method, undefined, "a read sends no method of its own");
});

test("status with waitS polls until the task finishes, then stops", async () => {
	const calls: Call[] = [];
	const answers = [
		{ progress: "in progress", state: "pending" },
		{ progress: "completed", state: "finished" },
	];
	let index = 0;
	const hive = createHive({
		token: "k",
		fetchImpl: (url, init) => {
			calls.push({ url, init: init ?? {} });
			const payload = answers[Math.min(index, answers.length - 1)] ?? {};
			index += 1;
			return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
		},
		sleep: () => Promise.resolve(),
	});
	const task = await hive.status("abc", 30);

	assert.equal(calls.length, 2, "the second poll saw the finished state and stopped");
	assert.equal((task as { state: string }).state, "finished");
});

test("a request sends exactly one input; two or none is refused before the network", async () => {
	const { calls, fetchImpl } = fakeFetch({ ok: true });
	const hive = createHive({ token: "k", fetchImpl });
	await assert.rejects(() => hive.sync({ url: "https://example.test/a.jpg", text: "two" }), HiveError);
	await assert.rejects(() => hive.sync({}), HiveError);
	assert.deepEqual(calls, []);
});

test("an HTTP failure names the status and the API's message, not a parse error", async () => {
	const { fetchImpl } = fakeFetch(
		null,
		401,
		JSON.stringify({ return_code: 401, message: "Invalid Auth Method. 'Token' authentication required." }),
	);
	const hive = createHive({ token: "wrong", fetchImpl });
	await assert.rejects(() => hive.sync({ url: "https://example.test/a.jpg" }), /HTTP 401.*Token' authentication required/);
});

test("a 200 that is not JSON says so instead of throwing a SyntaxError", async () => {
	const { fetchImpl } = fakeFetch(null, 200, "<html>bad gateway</html>");
	const hive = createHive({ token: "k", fetchImpl });
	await assert.rejects(() => hive.status("abc"), /non-JSON/);
});

test("readToken prefers HIVE_API_KEY, falls back to the agent-dir file, and names both when neither exists", () => {
	assert.equal(
		readToken({ HIVE_API_KEY: "from-env" }, () => "from-file\n"),
		"from-env",
	);
	assert.equal(
		readToken({}, () => "  from-file  \nanother line\n", "/home/x/.pi/agent"),
		"from-file",
	);
	assert.throws(() => readToken({}, () => "", "/home/x/.pi/agent"), /HIVE_API_KEY.*write the key as the first line of .*hive-key/);
	assert.throws(
		() =>
			readToken(
				{},
				() => {
					throw new Error("ENOENT");
				},
				"/home/x/.pi/agent",
			),
		/hive-key/,
		"a missing key file is the same message, not a raw ENOENT",
	);
});

test("the tool registers one tool named hive and reports its errors as text", async () => {
	const tools: { name: string; execute: (id: string, params: unknown) => Promise<{ content: { text: string }[] }> }[] = [];
	const pi = { registerTool: (tool: unknown) => tools.push(tool as (typeof tools)[number]) };
	hive(pi as never);

	assert.equal(tools.length, 1);
	const tool = tools[0];
	assert.ok(tool);
	assert.equal(tool.name, "hive");
	const result = await tool.execute("call-1", { op: "status" });
	assert.match(result.content[0]?.text ?? "", /op status needs taskId/);
});
