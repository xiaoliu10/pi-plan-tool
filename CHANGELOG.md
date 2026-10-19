# Changelog

## [0.0.1] - 2026-10-19

### 新增
- 首个版本：`desktop_update_plan` 任务清单工具（会话元数据，无副作用）+
  `PLAN_CHECKLIST_GUIDELINE` 引导语常量。从 pi-desktop 内置
  `extensions/desktop-policy/plan.mjs` 拆出，CLI 与 Desktop 共用同一实现。
- 工具名保持 `desktop_update_plan`：已写进真实会话历史（131 次调用），
  改名会断旧会话的计划渲染。
- 7 个测试：注册名、trim 语义、malformed 拒绝（非数组/空 step/非法状态/
  缺字段/超 30 项）、schema 主防线（additionalProperties/maxItems/required）、
  空数组清空语义、引导语关键句、无副作用 API 扫描。
