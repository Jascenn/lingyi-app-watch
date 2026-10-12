import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { pickBundleMatch } from "./jev.ts";
import type { AppBundleRecord, JevConfig, ThirdPartyPolicyEntry } from "./types.ts";

export async function loadThirdPartyPolicy(rootDirectory: string): Promise<ThirdPartyPolicyEntry[]> {
	const filePath = resolve(rootDirectory, "data", "third-party-policy.json");

	try {
		const raw = await readFile(filePath, "utf8");
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed) ? (parsed as ThirdPartyPolicyEntry[]) : [];
	} catch {
		return [];
	}
}

export function matchPolicyForBundle(
	bundle: AppBundleRecord | null | undefined,
	policies: ThirdPartyPolicyEntry[],
): ThirdPartyPolicyEntry | null {
	if (!bundle) {
		return null;
	}

	return (
		policies.find((policy) => policy.path === bundle.path) ??
		policies.find((policy) => !!bundle.bundleId && policy.bundleId === bundle.bundleId) ??
		policies.find((policy) => normalizeName(policy.name) === normalizeName(bundle.name)) ??
		null
	);
}

export function matchPolicyForName(
	name: string,
	policies: ThirdPartyPolicyEntry[],
): ThirdPartyPolicyEntry | null {
	const normalizedTarget = normalizeName(name);

	if (!normalizedTarget) {
		return null;
	}

	const exact = policies.filter((policy) => normalizeName(policy.name) === normalizedTarget);
	if (exact.length === 1) {
		return exact[0];
	}

	const fuzzy = policies
		.map((policy) => ({
			policy,
			score: fuzzyNameScore(normalizedTarget, normalizeName(policy.name)),
		}))
		.filter((item) => item.score > 0)
		.sort((left, right) => right.score - left.score);

	if (!fuzzy.length) {
		return null;
	}

	if (fuzzy.length === 1 || fuzzy[0].score > fuzzy[1].score) {
		return fuzzy[0].policy;
	}

	return null;
}

export async function findBestBundleForName(
	name: string,
	bundles: AppBundleRecord[],
	jevConfig: JevConfig | null = null,
): Promise<AppBundleRecord | null> {
	const normalizedTarget = normalizeName(name);

	if (!normalizedTarget) {
		return null;
	}

	const exact = bundles.filter((bundle) => normalizeName(bundle.name) === normalizedTarget);
	if (exact.length === 1) {
		return exact[0];
	}

	// 先用本地前缀/包含关系收敛候选，JEV 只在仍有歧义时兜底
	const prefixOrContains = bundles
		.map((bundle) => {
			const candidate = normalizeName(bundle.name);
			if (!candidate) {
				return null;
			}
			const isPrefix = candidate.startsWith(normalizedTarget) || normalizedTarget.startsWith(candidate);
			const contains = candidate.includes(normalizedTarget) || normalizedTarget.includes(candidate);
			return isPrefix || contains ? { bundle, score: isPrefix ? 90 : 80 } : null;
		})
		.filter((item): item is { bundle: AppBundleRecord; score: number } => item !== null)
		.sort((left, right) => right.score - left.score);

	if (
		prefixOrContains.length === 1 ||
		(prefixOrContains.length > 1 && prefixOrContains[0].score > prefixOrContains[1].score)
	) {
		return prefixOrContains[0].bundle;
	}

	if (!prefixOrContains.length) {
		const fuzzy = bundles
			.map((bundle) => ({
				bundle,
				score: fuzzyNameScore(normalizedTarget, normalizeName(bundle.name)),
			}))
			.filter((item) => item.score > 0)
			.sort((left, right) => right.score - left.score);

		if (fuzzy.length === 1 || (fuzzy.length > 1 && fuzzy[0].score > fuzzy[1].score)) {
			return fuzzy[0].bundle;
		}

		if (!jevConfig || bundles.length < 2) {
			return null;
		}

		return await pickBundleMatch(jevConfig, name, bundles);
	}

	// 有多个前缀/包含候选且分数相同，交给 JEV 从中选一个
	if (!jevConfig) {
		return null;
	}

	return await pickBundleMatch(jevConfig, name, prefixOrContains.map((item) => item.bundle));
}

function fuzzyNameScore(left: string, right: string): number {
	if (!left || !right) {
		return 0;
	}

	if (left === right) {
		return 100;
	}

	const shorterLength = Math.min(left.length, right.length);
	const longerLength = Math.max(left.length, right.length);
	const contains = left.includes(right) || right.includes(left);

	if (contains && shorterLength >= 6 && longerLength - shorterLength <= 3) {
		return 80 - (longerLength - shorterLength);
	}

	return 0;
}

function normalizeName(value: string | null | undefined): string {
	return (value ?? "").toLowerCase().replaceAll(/[^a-z0-9]+/g, "");
}
