import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../src/tui/app.js';
import * as providers from '../src/providers/index.js';

delete process.env.Z_AI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

const tick = () => new Promise(resolve => setTimeout(resolve, 20));

const send = async (stdin: { write: (value: string) => void }, input: string) => {
  stdin.write(input);
  await tick();
};

const waitFor = async (predicate: () => boolean, attempts = 30) => {
  for (let i = 0; i < attempts; i += 1) {
    if (predicate()) return true;
    await tick();
  }
  return false;
};

const down = '\u001b[B';
const enter = '\r';

const makeCore = () => {
  const calls = {
    create: [] as Array<{ name: string; providerKey: string; noTweak?: boolean }>,
    update: [] as Array<{ root: string; name: string }>,
    tweak: [] as Array<{ root: string; name: string }>,
    remove: [] as Array<{ root: string; name: string }>,
    doctor: [] as Array<{ root: string; bin: string }>,
  };

  const core = {
    DEFAULT_ROOT: '/tmp/cc-mirror-test',
    DEFAULT_BIN_DIR: '/tmp/cc-mirror-bin',
    DEFAULT_NPM_PACKAGE: '@anthropic-ai/claude-code',
    DEFAULT_NPM_VERSION: '2.0.76',
    listVariants: () => [
      {
        name: 'alpha',
        meta: {
          name: 'alpha',
          provider: 'zai',
          createdAt: '2025-12-31T00:00:00.000Z',
          claudeOrig: '/tmp/claude',
          binaryPath: '/tmp/alpha',
          configDir: '/tmp/alpha/config',
          tweakDir: '/tmp/alpha/tweakcc',
        },
      },
      {
        name: 'beta',
        meta: {
          name: 'beta',
          provider: 'minimax',
          createdAt: '2025-12-31T00:00:00.000Z',
          claudeOrig: '/tmp/claude',
          binaryPath: '/tmp/beta',
          configDir: '/tmp/beta/config',
          tweakDir: '/tmp/beta/tweakcc',
        },
      },
    ],
    createVariant: (params: {
      name: string;
      providerKey: string;
      noTweak?: boolean;
      promptPack?: boolean;
      promptPackMode?: 'minimal' | 'maximal';
      skillInstall?: boolean;
      shellEnv?: boolean;
      modelOverrides?: {
        sonnet?: string;
        opus?: string;
        haiku?: string;
        smallFast?: string;
        defaultModel?: string;
        subagentModel?: string;
      };
    }) => {
      calls.create.push(params);
      return { wrapperPath: `/tmp/bin/${params.name}`, meta: { name: params.name } as any, tweakResult: null };
    },
    updateVariant: (root: string, name: string, _opts?: { tweakccStdio?: 'pipe' | 'inherit'; binDir?: string }) => {
      calls.update.push({ root, name });
      return { meta: { name } as any, tweakResult: null };
    },
    tweakVariant: (root: string, name: string) => {
      calls.tweak.push({ root, name });
    },
    removeVariant: (root: string, name: string) => {
      calls.remove.push({ root, name });
    },
    doctor: (root: string, bin: string) => {
      calls.doctor.push({ root, bin });
      return [
        { name: 'alpha', ok: true, binaryPath: '/tmp/alpha', wrapperPath: '/tmp/bin/alpha' },
        { name: 'beta', ok: false, binaryPath: '/tmp/beta', wrapperPath: '/tmp/bin/beta' },
      ];
    },
  };

  return { core, calls };
};

test('TUI create flow uses template + no-tweak when selected', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await send(app.stdin, down); // home -> create
  await send(app.stdin, enter);
  await send(app.stdin, enter); // provider select -> default (zai)
  await send(app.stdin, enter); // brand preset (auto)
  await send(app.stdin, enter); // name
  await send(app.stdin, enter); // base url
  await send(app.stdin, enter); // api key
  await send(app.stdin, enter); // root dir
  await send(app.stdin, enter); // bin dir
  await send(app.stdin, down); // tweakcc? select No
  await send(app.stdin, enter);
  await send(app.stdin, enter); // install dev-browser? default Yes
  await send(app.stdin, enter); // write Z_AI_API_KEY? default Yes
  await send(app.stdin, down); // add env? select No
  await send(app.stdin, enter);

  const reachedSummary = await waitFor(() => {
    const frame = app.lastFrame() || '';
    return frame.includes('Review Configuration') || frame.includes('Extra environment variables');
  });
  assert.ok(reachedSummary);

  let frame = app.lastFrame() || '';
  if (frame.includes('Extra environment variables')) {
    await send(app.stdin, enter); // submit empty env line
    await waitFor(() => (app.lastFrame() || '').includes('Review Configuration'));
  }

  await send(app.stdin, enter); // summary -> create

  const created = await waitFor(() => calls.create.length > 0);
  assert.ok(created);
  assert.equal(calls.create.length, 1);
  assert.equal(calls.create[0].name, 'zai');
  assert.equal(calls.create[0].providerKey, 'zai');
  assert.equal(calls.create[0].noTweak, true);

  app.unmount();
});

test('TUI manage -> update flow', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, enter);
  await send(app.stdin, enter); // pick alpha
  await tick();
  await send(app.stdin, enter); // update
  await waitFor(() => calls.update.length > 0);

  assert.equal(calls.update.length, 1);
  assert.equal(calls.update[0].name, 'alpha');

  app.unmount();
});

test('TUI manage -> remove flow', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, enter);
  await send(app.stdin, enter); // pick alpha
  await tick();
  await send(app.stdin, down); // tweak
  await send(app.stdin, down); // remove
  await send(app.stdin, enter);
  await send(app.stdin, enter); // confirm remove
  await waitFor(() => calls.remove.length > 0);

  assert.equal(calls.remove.length, 1);
  assert.equal(calls.remove[0].name, 'alpha');

  app.unmount();
});

test('TUI update all flow', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, down); // updateAll
  await send(app.stdin, enter);
  await tick();

  assert.equal(calls.update.length, 2);
  assert.equal(calls.update[0].name, 'alpha');
  assert.equal(calls.update[1].name, 'beta');

  app.unmount();
});

test('TUI doctor flow', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, down); // updateAll
  await send(app.stdin, down); // doctor
  await send(app.stdin, enter);
  await tick();

  const frame = app.lastFrame() || '';
  assert.ok(frame.includes('alpha'));
  assert.ok(calls.doctor.length >= 1);
  assert.equal(calls.doctor[0].root, '/tmp/root');
  assert.equal(calls.doctor[0].bin, '/tmp/bin');

  app.unmount();
});

test('TUI settings flow updates root/bin used by doctor', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, down); // updateAll
  await send(app.stdin, down); // doctor
  await send(app.stdin, down); // settings
  await send(app.stdin, enter);

  await send(app.stdin, '/tmp/newroot');
  await send(app.stdin, enter);
  await send(app.stdin, '/tmp/newbin');
  await send(app.stdin, enter);

  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, down); // updateAll
  await send(app.stdin, down); // doctor
  await send(app.stdin, enter);
  await tick();

  const last = calls.doctor[calls.doctor.length - 1];
  assert.equal(last.root, '/tmp/root/tmp/newroot');
  assert.equal(last.bin, '/tmp/bin/tmp/newbin');

  app.unmount();
});
