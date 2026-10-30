import * as vm from 'vm';
import { PluginSandbox } from '../PluginSandbox';
(async () => {
  const s = new PluginSandbox();
  await s.create('p', []);
  const ctx = (s as any).sandboxes.get('p')!;
  const probes: Record<string,string> = {
    globalHost: 'typeof globalThis.process',
    envLeak: 'JSON.stringify(process.env)',
    hostCtorRequire: 'typeof require.constructor',
    hostCtorConsole: 'typeof console.log.constructor',
    hostCtorSetTimeout: 'typeof setTimeout.constructor',
    hostCtorNextTick: 'typeof process.nextTick.constructor',
    escapeRequire: 'String(require.constructor("return typeof process")())',
    escapeConsole: 'String(console.log.constructor("return typeof globalThis.process")())',
    escapeTimeout: 'String(setTimeout.constructor("return 1")())',
    fsRequire: '(function(){try{require("fs");return "ALLOWED"}catch(e){return "blocked:"+e.message}})()',
    childProcess: '(function(){try{require("child_process");return "ALLOWED"}catch(e){return "blocked"}})()',
  };
  for (const [k, code] of Object.entries(probes)) {
    try {
      const r = vm.runInContext(code, ctx);
      console.log(k, '=>', String(r));
    } catch (e: any) { console.log(k, '=> THREW', e.message); }
  }
})();
