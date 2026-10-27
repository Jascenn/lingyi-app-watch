# 安全政策 Security Policy

## 支持的版本

安全修复优先覆盖 `main` 和最新正式版本；更早版本只在不改变兼容边界且风险可控时处理。

## 私下报告漏洞

**不要开公开 Issue，也不要在公开群聊中披露未修复漏洞。**

优先使用 GitHub 的私有漏洞报告：

https://github.com/Jascenn/local-software-update-monitor/security/advisories/new

如果仓库尚未启用该入口，请通过 [Jascenn 的 GitHub 主页](https://github.com/Jascenn) 联系维护者，并只提供最少必要信息。报告请包含受影响版本、复现步骤、影响范围和可安全公开的证据；不要附带真实密钥、用户数据或完整生产日志。

维护者目标是在 48 小时内确认收到，并在修复可用后更新 CHANGELOG。补丁发布前，请给维护者合理的协调披露时间。

## 本仓库的安全约定

- 不要提交真实的 `monitor.config.json`、`data/settings.json`、TypeSafe API Key、代理凭据或本机软件清单。
- 改动扫描、来源判断、升级策略或 AI 风险评估时，必须同时覆盖无 API Key、AI 请求失败和本地规则回退三条路径。
- `site/` 是对外展示页，修改页面文案、截图或下载入口时应单独提 PR，并明确是否影响 `watch.lingyi.tools`。
- 不要用压缩或替换图片来“优化体积”；涉及现有截图与视频时先取得维护者确认。

## 不在范围内

由用户本机环境、第三方服务、上游项目或自行修改后的代码导致的问题，不直接视为本仓库漏洞；但仍欢迎报告，维护者会协助判断边界。
