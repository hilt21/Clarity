/* Clarity workflow core: deterministic, side-effect-free, no AI or network. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ClarityFlow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '0.2.0';
  const FIELDS = Object.freeze(['context', 'goal', 'evidence', 'constraints', 'deliverable', 'acceptance', 'unknown']);
  const SCREENS = Object.freeze(['setup', 'interview', 'challenge', 'review']);
  const UNKNOWN = '[待确认]';
  const DEFAULT_LIMITS = Object.freeze({ yes: 0.65, no: 0.35 });

  function createSession(options) {
    const input = options || {};
    return {screen: 'setup', scenario: input.scenario || 'embc', initial: input.initial || '',
      step: 0, answers: {}, draft: '', stress: null, teachback: null,
      dialog: false, message: ''};
  }
  function isChoice(x) { return Number.isInteger(x) && x >= 0 && x <= 2; }
  function isAnswer(x) { return typeof x === 'string' && x.trim().length > 0; }
  function hasAllAnswers(answers) {
    return !!answers && FIELDS.every(k => Object.prototype.hasOwnProperty.call(answers, k) && isAnswer(answers[k]));
  }
  function canReview(s) {
    return s.screen === 'challenge' && hasAllAnswers(s.answers) && isChoice(s.stress) && isChoice(s.teachback);
  }
  function restore(raw) {
    if (!raw || typeof raw !== 'object' || !SCREENS.includes(raw.screen) ||
        !Number.isInteger(raw.step) || raw.step < 0 || raw.step >= FIELDS.length ||
        typeof raw.initial !== 'string' || typeof raw.scenario !== 'string' ||
        !raw.answers || typeof raw.answers !== 'object' || Array.isArray(raw.answers)) return null;
    const answers = {};
    for (const k of FIELDS) {
      if (Object.prototype.hasOwnProperty.call(raw.answers, k)) {
        if (typeof raw.answers[k] !== 'string') return null;
        answers[k] = raw.answers[k];
      }
    }
    if (raw.screen === 'challenge' || raw.screen === 'review') {
      if (!hasAllAnswers(answers)) return null;
    }
    if (raw.screen === 'review' && (!isChoice(raw.stress) || !isChoice(raw.teachback))) return null;
    return {...createSession({scenario:raw.scenario,initial:raw.initial}),...raw,
      answers, dialog:false, message:'', draft:typeof raw.draft==='string'?raw.draft:''};
  }
  function transition(old, event) {
    const s = {...old, answers: {...old.answers}, message:''};
    const fail = message => ({state:{...old,message},accepted:false,reason:message});
    if (!event || typeof event.type !== 'string') return fail('无效事件');
    switch(event.type) {
      case 'SELECT_SCENARIO':
        if (s.screen !== 'setup') return fail('当前阶段不能切换案例');
        return {state:createSession({scenario:event.scenario,initial:event.initial}),accepted:true};
      case 'START':
        if (s.screen !== 'setup') return fail('当前阶段不能开始新访谈');
        if (!isAnswer(event.initial)) return fail('请填写初始需求');
        return {state:{...createSession({scenario:s.scenario,initial:event.initial.trim()}),screen:'interview'},accepted:true};
      case 'ANSWER':
        if (s.screen !== 'interview') return fail('当前阶段不能记录访谈答案');
        if (!isAnswer(event.value)) return fail('请填写回答，或者明确选择“暂时未知”');
        s.answers[FIELDS[s.step]]=event.value.trim();s.draft='';
        if (s.step === FIELDS.length-1) {s.screen='challenge';s.stress=null;s.teachback=null;}
        else s.step++;
        return {state:s,accepted:true};
      case 'BACK':
        if (s.screen !== 'interview') return fail('当前阶段不能返回访谈');
        if (s.step > 0) {s.step--;s.draft=s.answers[FIELDS[s.step]] || '';} else s.screen='setup';
        return {state:s,accepted:true};
      case 'MARK_UNKNOWN':
        return transition(s,{type:'ANSWER',value:UNKNOWN});
      case 'CHOOSE':
        if (s.screen !== 'challenge') return fail('当前阶段不能设置验证选择');
        if (!['stress','teachback'].includes(event.field) || !isChoice(event.value)) return fail('无效选择');
        s[event.field]=event.value;return {state:s,accepted:true};
      case 'REVISE':
        if (s.screen !== 'challenge') return fail('当前阶段不能修改访谈');
        s.screen='interview';s.step=FIELDS.length-1;
        s.draft=s.answers[FIELDS.at(-1)]||'';s.stress=null;s.teachback=null;
        return {state:s,accepted:true};
      case 'FINISH':
        if (!canReview(s)) return fail('请先完成所有回答和两项验证');
        s.screen='review';return {state:s,accepted:true};
      case 'RESTART':
        return {state:createSession({scenario:s.scenario,initial:s.initial}),accepted:true};
      default: return fail('未知事件：'+event.type);
    }
  }
  function propositions(s) {
    const a=s.answers||{};
    return [
      {id:'problem-specific',field:'context',question:'问题描述是否指出了使用者、场景和可观察的差距？',evidence:a.context||''},
      {id:'goal-outcome',field:'goal',question:'目标是否清楚表述了结果，而非预先限定实现方案？',evidence:a.goal||''},
      {id:'evidence-grounded',field:'evidence',question:'陈述是否区分了已知事实、推断和待验证假设？',evidence:a.evidence||''},
      {id:'boundary-explicit',field:'constraints',question:'约束是否说明了必须遵守与不得改变的边界？',evidence:a.constraints||''},
      {id:'acceptance-testable',field:'acceptance',question:'验收条件是否有可观察的动作和预期结果？',evidence:a.acceptance||''},
      {id:'uncertainty-visible',field:'unknown',question:'关键未知因素是否明确表达，并留下核验方式？',evidence:a.unknown||''}
    ];
  }
  function decideProbability(pYes, limits) {
    const l={...DEFAULT_LIMITS,...(limits||{})};
    if (!(l.no >= 0 && l.no < l.yes && l.yes <= 1)) throw new Error('Invalid threshold range');
    if (typeof pYes !== 'number' || !Number.isFinite(pYes) || pYes < 0 || pYes > 1)
      throw new Error('Invalid P(yes): must be a finite number in [0,1]');
    return {decision:pYes>=l.yes?'YES':pYes<=l.no?'NO':'UNKNOWN',pYes};
  }
  function rulePrecheck(s) {
    const results = propositions(s).map(p=>({id:p.id,
      decision:!isAnswer(p.evidence)||p.evidence.trim()===UNKNOWN?'UNKNOWN':'REVIEW_REQUIRED',
      source:'deterministic',reason:'纯文本存在；语义正确性未验证'}));
    return {ready:hasAllAnswers(s.answers),checks:results,modelCalls:0};
  }
  return Object.freeze({VERSION,FIELDS,SCREENS,UNKNOWN,DEFAULT_LIMITS,createSession,
    hasAllAnswers,canReview,restore,transition,propositions,decideProbability,rulePrecheck});
});
