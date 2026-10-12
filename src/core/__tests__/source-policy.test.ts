import assert from "node:assert/strict";
import test from "node:test";

import { findBestBundleForName } from "../source-policy.ts";
import type { AppBundleRecord } from "../types.ts";

function bundle(name: string, path = `/Applications/${name}.app`): AppBundleRecord {
	return {
		name,
		path,
		bundleId: `com.example.${name.toLowerCase()}`,
		version: "1.0.0",
		lastActivityAt: null,
	};
}

test("前缀匹配：iTerm 能匹配 iTerm2", async () => {
	const bundles = [bundle("iTerm2"), bundle("Safari")];
	const result = await findBestBundleForName("iTerm", bundles, null);
	assert.equal(result?.name, "iTerm2");
});

test("唯一前缀候选不需要 JEV", async () => {
	const bundles = [bundle("iTerm2"), bundle("iTerm")];
	const result = await findBestBundleForName("iTerm2", bundles, null);
	assert.equal(result?.name, "iTerm2");
});

test("无匹配且无 JEV 时返回 null", async () => {
	const bundles = [bundle("Safari"), bundle("Mail")];
	const result = await findBestBundleForName("Firefox", bundles, null);
	assert.equal(result, null);
});

test("缩写名 VSCode 无本地候选且无 JEV 时返回 null（有 JEV 时才会语义匹配）", async () => {
	const bundles = [bundle("Visual Studio Code"), bundle("Safari")];
	const result = await findBestBundleForName("VSCode", bundles, null);
	assert.equal(result, null);
});

test("JEV 配置存在但网络不可用时安全返回本地最优候选", async () => {
	const bundles = [bundle("iTerm"), bundle("iTerm2")];
	const result = await findBestBundleForName("iTerm2", bundles, {
		apiKey: "test",
		model: "jev-latest",
		timeoutMs: 1,
	});
	assert.equal(result?.name, "iTerm2");
});
