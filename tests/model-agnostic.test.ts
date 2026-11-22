import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const ROOT = resolve(import.meta.dirname, "..");

test("the package leaves model choice to the Pi session", () => {
	const settings = JSON.parse(readFileSync(join(ROOT, ".pi", "settings.json"), "utf8"));
	for (const key of ["defaultProvider", "defaultModel", "defaultThinkingLevel"]) {
		assert.equal(settings[key], undefined, `package must not pin ${key}`);
	}
	for (const name of ["explore", "scout", "general", "reviewer", "designer", "ultra-scout", "ultra-verifier"]) {
		const text = readFileSync(join(ROOT, ".pi", "agents", `${name}.md`), "utf8");
		assert.doesNotMatch(text, /^model:|^thinking:/m, `${name} must inherit the session model and thinking level`);
	}
});

test("setup preserves a project's model settings and role override", () => {
	const target = mkdtempSync(join(tmpdir(), "pi-harness-model-"));
	mkdirSync(join(target, ".pi", "agents"), { recursive: true });
	const settingsPath = join(target, ".pi", "settings.json");
	const settings = { defaultProvider: "ollama", defaultModel: "deepseek", defaultThinkingLevel: "medium", theme: "dark" };
	writeFileSync(settingsPath, `${JSON.stringify(settings)}\n`);
	const rolePath = join(target, ".pi", "agents", "reviewer.md");
	const shipped = readFileSync(join(ROOT, ".pi", "agents", "reviewer.md"), "utf8");
	writeFileSync(rolePath, shipped.replace("\n---\n", "\nmodel: ollama/deepseek\n---\n"));
	const script = join(ROOT, "scripts", "setup-project.mjs");
	execFileSync(process.execPath, [script, target]);
	assert.deepEqual(JSON.parse(readFileSync(settingsPath, "utf8")), settings);
	assert.match(readFileSync(rolePath, "utf8"), /^model: ollama\/deepseek$/m);
	execFileSync(process.execPath, [script, target]);
	assert.match(readFileSync(rolePath, "utf8"), /^model: ollama\/deepseek$/m);
});
