# Clarity · 需求表达训练台

**Workflow owns the process. The model only judges.**

Clarity 是一个极简的单页面需求表达训练 App。它帮助使用者将模糊需求逐步转化为可验证的 Requirement Brief。当前版本 **v0.2.0** 完全离线运行；不需要登录、外部 AI API 或账户权限。

## 运行

将仓库中的 `index.html` 与 `workflow-core.js` 放在同一目录。使用浏览器打开 `index.html`，或运行本地静态服务器：

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

设计为一个页面，界面简洁，支持手机与桌面。浏览器会尽可能使用 localStorage 保存本地进度；本地数据可在界面内清除。

## MVP 功能

- 三个模拟需求：EMBC 机构运动学、知识网站结构、AI Agent 工作流。
- 一个自由输入入口：七个固定澄清问题，逐题回答，允许显式记录「待确认」。
- 必须经过的阶段：初始需求 → 七轮访谈 → 反例挑战和 Teach-Back → 评分复盘。
- 可复制或导出 Markdown 需求简报，保留使用者原始表达。
- 不依赖任何模型。规则检查不能证明自由文本的语义正确性，当前 0–10 分只是结构启发式反馈。

## 核心架构

```text
index.html (UI, local storage)
     |
     v
workflow-core.js (pure state reducer)
  ├─ transition(): validates events and guards stage changes
  ├─ restore(): checks persisted progress
  ├─ propositions(): deterministic atomic semantic checks
  ├─ rulePrecheck(): never claims semantic success
  └─ decideProbability(): P(yes) → YES / NO / UNKNOWN
     |
     +-- optional future judge adapter (Jev or other provider): NOT CONNECTED
```

**关键原则**

1. 工作流与页面状态由代码控制：模型不得决定访谈下一步、修改状态或发起账户操作。
2. 自动规则处理完整性、分支和输出格式；自由文本的语义判断才需要可插拔判断器。
3. 每项判断必须是一个清晰的原子命题。将概率按照可配置阈值归类为 YES、NO 或 UNKNOWN。初始示范阈值为 YES ≥ 0.65，NO ≤ 0.35，其余 UNKNOWN；未经标注数据校准。
4. UNKNOWN 和执行者未验证必须明确显示，不能当作已通过。
5. 当隐含需求的识别需要复杂推理、检索或事实确认时，固定提问或人工参与优先；不保证仅靠二元判断可以完成所有澄清。

完整设计及数据、权限边界：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 测试

```sh
node tests/test_workflow.js
node tests/test_static_contract.js
```

> 注意：`tests/browser_smoke.py` 为适配沙箱环境，会将外部工作流脚本注入为内联脚本，不能证明正常加载路径的 CSP 配置正确。加载路径检查见 `test_static_contract.js`；真实浏览器静态服务环境仍需单独验收。

当前验证基线与已知风险：[docs/VERIFICATION-2026-11-16.md](docs/VERIFICATION-2026-11-16.md)。

此处包含 19 个以上状态与判断接口的单元检查。完整本地 UI 验证另使用 Chromium / Playwright，已执行 40 项界面行为检查，覆盖流程、模拟答案、未知、撤销、导出、XSS 文字转义和无外部网络请求。后续应在 CI 加入浏览器回归测试。

## 权限：真实账户接入之前

**当前无需任何账户权限。** 本地浏览器可能以明文存储训练数据，暂不建议输入内部机密需求。

如未来接入：模型判断需要服务端安全存储的推理 API 凭据、用户明确同意发送指定文本、预算/调用限制；登录仅申请 OIDC `openid`；跨设备同步仅允许用户自身记录读写删；导入第三方素材时单独申请所选文件的读取权限；所有外部写入操作默认禁用、单独授权。不能将 API 密钥放到前端。

没有实际配置任何 Jev、OpenAI、GitHub、邮箱或 Google 账户连接。

## 方法来源

Double Diamond、JTBD、QFT、INCOSE requirements、EARS、Teach-Back，以及 Jev 的 typed decision 模式。外部原始资料和决策边界参见 [架构文档](docs/ARCHITECTURE.md)。
