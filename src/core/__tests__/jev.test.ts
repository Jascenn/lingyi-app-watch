import assert from "node:assert/strict";
import test from "node:test";

import { loadJevConfigFromEnv } from "../jev.ts";

test("loadJevConfigFromEnv 返回 null 当没有 key", () => {
	assert.equal(loadJevConfigFromEnv({}), null);
});

test("loadJevConfigFromEnv 读取 key 和可选 model", () => {
	const config = loadJevConfigFromEnv({ TYPESAFE_API_KEY: " test-key ", TYPESAFE_MODEL: "jev-1.13.0" });
	assert.ok(config);
	assert.equal(config.apiKey, "test-key");
	assert.equal(config.model, "jev-1.13.0");
});

test("loadJevConfigFromEnv 默认 model 是 jev-latest", () => {
	const config = loadJevConfigFromEnv({ TYPESAFE_API_KEY: "k" });
	assert.ok(config);
	assert.equal(config.model, "jev-latest");
});
