import { ProxyAgent, fetch as undiciFetch } from "undici";
import type { AppBundleRecord, AppStatus, JevConfig } from "./types.ts";
import type { MonitorSettings } from "../storage/settings.ts";

const JEV_ENDPOINT = process.env.TYPESAFE_ENDPOINT?.trim() || "https://api.typesafe.ai/v1/systemone";

export interface JevRiskAssessment {
	riskLevel: "low" | "medium" | "high" | "unknown";
	reason: string | null;
	confidence: number | null;
	source: "jev" | "fallback";
}

interface NoulAnswer {
	noul?: number;
}

interface ChoiceAnswer {
	choice?: string;
	confidence?: number;
	probabilities?: Record<string, number>;
}

interface JevResponse {
	answers?: Record<string, NoulAnswer | ChoiceAnswer>;
	usage?: {
		input_tokens: number;
		output_tokens: number;
	};
}

export function loadJevConfigFromEnv(
	env: NodeJS.ProcessEnv = process.env,
	settings?: MonitorSettings | null,
): JevConfig | null {
	const apiKey = env.TYPESAFE_API_KEY?.trim();
	if (!apiKey && !settings?.typesafeApiKey?.trim()) {
		return null;
	}

	if (!apiKey) {
		const settingsKey = settings?.typesafeApiKey?.trim();
		if (!settingsKey) {
			return null;
		}
		return {
			apiKey: settingsKey,
			model: env.TYPESAFE_MODEL?.trim() || settings?.typesafeModel?.trim() || "jev-latest",
			timeoutMs: 30_000,
			proxyUrl: env.TYPESAFE_PROXY_URL?.trim() || settings?.typesafeProxyUrl?.trim() || undefined,
		};
	}

	return {
		apiKey,
		model: env.TYPESAFE_MODEL?.trim() || "jev-latest",
		timeoutMs: 30_000,
		proxyUrl: env.TYPESAFE_PROXY_URL?.trim() || settings?.typesafeProxyUrl?.trim() || undefined,
	};
}

export async function assessUpgradeRisks(
	config: JevConfig,
	statuses: AppStatus[],
): Promise<Map<string, JevRiskAssessment>> {
	const candidates = statuses.filter(
		(item) => item.status === "update-available",
	);
	const results = new Map<string, JevRiskAssessment>();
	if (!candidates.length) {
		return results;
	}

	const questions: Record<string, unknown> = {};
	for (const [index, item] of candidates.entries()) {
		questions[`risk_${index}`] = {
			type: "choice",
			instructions: {
				app: {
					name: item.displayName,
					channel: item.channel,
					activationSource: item.activationSource ?? "unknown",
					upgradePolicy: item.upgradePolicy,
					installedVersion: item.installedVersion ?? "unknown",
					latestVersion: item.latestVersion ?? "unknown",
				},
				question: "升级 `app` 到最新版本的风险等级是什么？",
			},
			criteria: {
				low: "常规官方渠道更新，激活和插件兼容性基本不受影响",
				medium: "建议先备份或确认兼容性，可能影响扩展、补丁或授权",
				high: "很可能破坏第三方激活、插件或数据兼容性，应暂缓升级",
			},
		};
		questions[`breaks_activation_${index}`] = {
			type: "noul",
			instructions: {
				app: {
					name: item.displayName,
					activationSource: item.activationSource ?? "unknown",
					upgradePolicy: item.upgradePolicy,
				},
				question: "升级 `app` 是否很可能让当前的第三方激活或补丁失效？",
			},
		};
	}

	const response = await requestJev(config, {
		state: candidates.map((item) => ({
			id: item.id,
			name: item.displayName,
			from: item.installedVersion,
			to: item.latestVersion,
			channel: item.channel,
			activationSource: item.activationSource,
			upgradePolicy: item.upgradePolicy,
		})),
		model: config.model,
		questions,
	});

	for (const [index, item] of candidates.entries()) {
		const risk = asChoice(response.answers?.[`risk_${index}`]);
		const breaksActivation = asNoul(response.answers?.[`breaks_activation_${index}`])?.noul ?? 0;
		results.set(item.id, toAssessment(risk, breaksActivation));
	}

	return results;
}

export async function pickBundleMatch(
	config: JevConfig,
	appName: string,
	bundles: AppBundleRecord[],
): Promise<AppBundleRecord | null> {
	const questions = {
		match: {
			type: "choice",
			instructions: {
				package_name: appName,
				question: "`package_name` 指的是哪一个已安装应用？只根据名称判断，不要猜测安装路径。",
			},
			criteria: Object.fromEntries(bundles.map((bundle, index) => [String(index), bundle.name])),
		},
	} as const;

	try {
		const response = await requestJev(config, {
			state: bundles.map((bundle) => ({ index: String(bundles.indexOf(bundle)), name: bundle.name })),
			model: config.model,
			questions,
		});
		const chosen = asChoice(response.answers?.match)?.choice;
		const index = Number(chosen);
		if (!Number.isInteger(index) || index < 0 || index >= bundles.length) {
			return null;
		}
		return bundles[index] ?? null;
	} catch {
		return null;
	}
}

function asChoice(answer: NoulAnswer | ChoiceAnswer | undefined): ChoiceAnswer | undefined {
	return answer && "choice" in answer ? answer : undefined;
}

function asNoul(answer: NoulAnswer | ChoiceAnswer | undefined): NoulAnswer | undefined {
	return answer && "noul" in answer ? answer : undefined;
}

function toAssessment(risk: ChoiceAnswer | undefined, breaksActivation: number): JevRiskAssessment {
	const choice = risk?.choice;
	let riskLevel: JevRiskAssessment["riskLevel"];
	if (choice === "low" || choice === "medium" || choice === "high") {
		riskLevel = choice;
	} else {
		riskLevel = "unknown";
	}

	if (riskLevel !== "high" && breaksActivation >= 0.7) {
		riskLevel = "high";
	}

	const confidence = typeof risk?.confidence === "number" ? risk.confidence : null;
	return {
		riskLevel,
		reason: buildReason(riskLevel, breaksActivation, confidence),
		confidence,
		source: riskLevel === "unknown" ? "fallback" : "jev",
	};
}

function buildReason(riskLevel: string, breaksActivation: number, confidence: number | null): string {
	const activationNote = breaksActivation >= 0.7 ? "第三方激活/补丁可能失效" : "激活兼容性风险较低";
	const confidenceNote = confidence === null ? "" : `（置信度 ${(confidence * 100).toFixed(0)}%）`;

	switch (riskLevel) {
		case "low":
			return `JEV 判断可以正常升级，${activationNote}${confidenceNote}`;
		case "medium":
			return `JEV 建议先备份确认，${activationNote}${confidenceNote}`;
		case "high":
			return `JEV 判断高风险，${activationNote}${confidenceNote}`;
		default:
			return "JEV 未给出可用判断，按本地策略处理";
	}
}

async function requestJev(config: JevConfig, body: Record<string, unknown>): Promise<JevResponse> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), config.timeoutMs);

	try {
		const dispatcher = config.proxyUrl ? new ProxyAgent(config.proxyUrl) : undefined;
		const response = await undiciFetch(JEV_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
			signal: controller.signal,
			...(dispatcher ? { dispatcher } : {}),
		});

		if (!response.ok) {
			throw new Error(`JEV request failed: ${response.status} ${response.statusText}`);
		}

		return (await response.json()) as JevResponse;
	} finally {
		clearTimeout(timer);
	}
}
