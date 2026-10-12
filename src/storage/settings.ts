import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface MonitorSettings {
	typesafeApiKey?: string;
	typesafeModel?: string;
	typesafeProxyUrl?: string;
}

export function getSettingsPath(rootDirectory: string): string {
	return resolve(rootDirectory, "data", "settings.json");
}

export async function loadSettings(rootDirectory: string): Promise<MonitorSettings> {
	try {
		const raw = await readFile(getSettingsPath(rootDirectory), "utf8");
		const parsed = JSON.parse(raw) as MonitorSettings;
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export async function saveSettings(rootDirectory: string, settings: MonitorSettings): Promise<MonitorSettings> {
	const filePath = getSettingsPath(rootDirectory);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
	return settings;
}
