import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import registerPlanTool, { PLAN_TOOL_NAME, PLAN_CHECKLIST_GUIDELINE } from './index.mjs';

/** 最小 pi 桩：捕获注册的工具定义，模拟 execute 行为。 */
function fakePi() {
  const tools = new Map();
  return {
    tools,
    registerTool(tool) {
      if (tools.has(tool.name)) throw new Error(`duplicate tool: ${tool.name}`);
      tools.set(tool.name, tool);
    },
  };
}

describe('registerPlanTool', () => {
  it('registers the desktop_update_plan tool with the historical name', () => {
    const pi = fakePi();
    registerPlanTool(pi);
    assert.ok(pi.tools.has(PLAN_TOOL_NAME));
    assert.equal(PLAN_TOOL_NAME, 'desktop_update_plan'); // 116MB 历史会话兼容
  });

  it('accepts a valid checklist and returns structured details', async () => {
    const pi = fakePi();
    registerPlanTool(pi);
    const result = await pi.tools.get(PLAN_TOOL_NAME).execute('call-1', {
      plan: [
        { step: '  摸清落地形态  ', status: 'in_progress' },
        { step: '写实现', status: 'pending' },
        { step: '测试', status: 'completed' },
      ],
    });
    const payload = JSON.parse(result.content[0].text);
    assert.deepEqual(payload.plan, [
      { step: '摸清落地形态', status: 'in_progress' }, // step 被 trim
      { step: '写实现', status: 'pending' },
      { step: '测试', status: 'completed' },
    ]);
    assert.equal(result.details.plan.length, 3);
  });

  it('rejects malformed payloads (never silently accept)', async () => {
    const pi = fakePi();
    registerPlanTool(pi);
    const tool = pi.tools.get(PLAN_TOOL_NAME);
    for (const bad of [
      { plan: 'not-array' },
      { plan: [{ step: '', status: 'pending' }] },
      { plan: [{ step: 'x', status: 'done' }] }, // 非法状态
      { plan: [{ step: 'x' }] }, // 缺 status
      // 注意：{extra:1} 这类 schema 违发由 parameters.additionalProperties:false 在
      // pi 侧拒绝（不进 execute）；运行时 normalizePlan 只兜底 step/status 类型。
      // 与原 Desktop 内置版行为一致——schema 主防线 + 运行时兜底。
      { plan: Array.from({ length: 31 }, (_, i) => ({ step: `s${i}`, status: 'pending' })) },
    ]) {
      await assert.rejects(() => tool.execute('c', bad), /任务清单格式无效/, `should reject: ${JSON.stringify(bad).slice(0, 60)}`);
    }
  });

  it('schema forbids extra fields and caps the list (first line of defense)', () => {
    const pi = fakePi();
    registerPlanTool(pi);
    const schema = pi.tools.get(PLAN_TOOL_NAME).parameters;
    assert.equal(schema.properties.plan.items.additionalProperties, false);
    assert.equal(schema.properties.plan.maxItems, 30);
    assert.deepEqual(schema.required, ['plan']);
    assert.equal(schema.additionalProperties, false);
  });

  it('accepts an empty plan as an explicit clear (same semantics as the built-in version)', async () => {
    const pi = fakePi();
    registerPlanTool(pi);
    const result = await pi.tools.get(PLAN_TOOL_NAME).execute('c', { plan: [] });
    assert.deepEqual(JSON.parse(result.content[0].text), { plan: [] });
  });

  it('exports the checklist guideline (host injects it into systemPrompt)', () => {
    assert.match(PLAN_CHECKLIST_GUIDELINE, /\(desktop_update_plan\) is MANDATORY/);
    assert.match(PLAN_CHECKLIST_GUIDELINE, /exactly one step in_progress/);
    assert.match(PLAN_CHECKLIST_GUIDELINE, /Never mark anything completed that has not been verified/);
  });

  it('never exposes side-effecting APIs (metadata-only tool)', () => {
    const pi = fakePi();
    registerPlanTool(pi);
    const tool = pi.tools.get(PLAN_TOOL_NAME);
    // 工具定义里不得出现 shell/exec/write 之类能力声明
    const serialized = JSON.stringify(tool).toLowerCase();
    for (const forbidden of ['exec', 'shell', 'spawn', 'writefile', 'rm ', 'unlink']) {
      assert.ok(!serialized.includes(forbidden), `must not mention ${forbidden}`);
    }
  });
});
