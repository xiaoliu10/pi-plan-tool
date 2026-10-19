/**
 * 任务清单工具（registerPlanTool）：把 Desktop 内置 desktop_update_plan 拆成
 * 独立 npm 包，让 pi CLI 与 Desktop 共用同一份「任务纪律」实现。
 *
 * 设计约束（从 Desktop 内置版原样迁移，行为零变化）：
 * - 纯会话元数据工具：永不执行命令、永不改项目文件（安全面最小化）
 * - 只做校验 + 结构化回传：details.plan 供宿主渲染进度面板
 * - 工具名保持 `desktop_update_plan`：已写进 116MB 历史会话（131 次调用），
 *   改名会让旧会话的计划渲染断链（审计文档「待拍板」项，结论：兼容优先）
 * - 引导语常量导出（PLAN_CHECKLIST_GUIDELINE）：宿主在 systemPrompt 注入用，
 *   Desktop index.mjs 与 CLI 用户可共用同一份文案，不漂移
 */

/** 工具名：兼容历史会话的既成事实，不做 alias（多名字会让旧渲染找不到）。 */
export const PLAN_TOOL_NAME = 'desktop_update_plan';

/** 多步任务的清单纪律（Desktop 内置 index.mjs 的原文迁移）。 */
export const PLAN_CHECKLIST_GUIDELINE =
  'Task checklist (desktop_update_plan) is MANDATORY for any non-trivial task: each NEW user task gets its OWN checklist — do not assume an earlier checklist still applies. Before starting work, create a checklist of 3-10 steps covering the whole task. While working: keep exactly one step in_progress at a time; mark a step completed the moment it is done (never batch updates); add newly discovered steps as you go. Never mark anything completed that has not been verified.';

/** 单条计划项的运行时校验（与 JSON Schema 双重保险：schema 之外的类型断言）。 */
function normalizePlan(value) {
  if (!Array.isArray(value)) throw new Error('任务清单格式无效');
  if (value.length > 30) throw new Error('任务清单格式无效');
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('任务清单格式无效');
    const step = item.step;
    const status = item.status;
    if (typeof step !== 'string' || !step.trim() || step.length > 500) throw new Error('任务清单格式无效');
    if (!['pending', 'in_progress', 'completed'].includes(String(status))) throw new Error('任务清单格式无效');
    return { step: step.trim(), status: String(status) };
  });
}

/**
 * 注册任务清单工具。pi 扩展的默认导出签名（pi 实例）。
 * 幂等：重复注册由 pi 自己去重（同名工具冲突时 pi 会抛错，宿主应二选一加载）。
 */
export default function registerPlanTool(pi) {
  pi.registerTool({
    name: PLAN_TOOL_NAME,
    label: '更新任务进度',
    description:
      'Maintain the task checklist. For multi-step work, create a short plan then update it as steps start or finish. Send the entire list each time; statuses must reflect actual progress. This only stores session metadata.',
    parameters: {
      type: 'object',
      required: ['plan'],
      additionalProperties: false,
      properties: {
        plan: {
          type: 'array',
          maxItems: 30,
          items: {
            type: 'object',
            required: ['step', 'status'],
            additionalProperties: false,
            properties: {
              step: { type: 'string', minLength: 1, maxLength: 500 },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            },
          },
        },
      },
    },
    async execute(_id, args) {
      const plan = normalizePlan(args.plan);
      return { content: [{ type: 'text', text: JSON.stringify({ plan }) }], details: { plan } };
    },
  });
}
