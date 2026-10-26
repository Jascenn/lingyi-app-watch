# 贡献指南 Contributing

`LingYi App Watch`：本地优先的 macOS 软件更新看板。 小改动可以直接提 PR；涉及对外行为、数据结构、发布流程或批量重构时，请先开 Issue 对齐范围。

## 本地验证

```bash
npm ci
npm run check
npm test
npm run build
```

如果 README 的安装步骤无法照做，请把它当作 bug 提交。不要把“在我机器上能跑”当作验证完成。

## 分支与提交

- 分支名使用 `feat/`、`fix/`、`docs/`、`refactor/`、`chore/` 前缀和 kebab-case 描述。
- `main` 只接受 PR；不要直接推送，也不要 force push 已共享的分支。
- 提交标题使用 Conventional Commits，例如 `fix(cli): preserve backup before overwrite`。
- 一个 PR 只解决一个问题。行为变化、格式化、依赖升级不要混在同一次提交里。
- 默认建议 squash merge，让一个 PR 对应 `main` 上的一条可回溯记录。

## 本项目的安全边界

- 不要提交真实的 `monitor.config.json`、`data/settings.json`、TypeSafe API Key、代理凭据或本机软件清单。
- 改动扫描、来源判断、升级策略或 AI 风险评估时，必须同时覆盖无 API Key、AI 请求失败和本地规则回退三条路径。
- `site/` 是对外展示页，修改页面文案、截图或下载入口时应单独提 PR，并明确是否影响 `watch.lingyi.tools`。
- 不要用压缩或替换图片来“优化体积”；涉及现有截图与视频时先取得维护者确认。

## PR 最少要写什么

1. 为什么需要改，关联的 Issue 或具体问题。
2. 改了什么，以及明确没有改什么。
3. 陌生人能照着执行的验证命令和结果。
4. 影响面与回滚方式；涉及页面时附桌面和移动端截图。

## 审查与合并

单人维护时，PR 的价值是给未来的自己留下“当时为什么这样做”。评论建议标注 `【阻塞】`、`【建议】` 或 `【nit】`。安全漏洞不要开公开 Issue，请按 [SECURITY.md](SECURITY.md) 私下报告。

## 范围

本项目主要覆盖：macOS 扫描逻辑、CLI、本地接口、风险策略、官网静态页面和发布文档。
