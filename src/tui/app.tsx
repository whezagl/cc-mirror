import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import path from 'node:path';
import type { BrandPreset } from '../brands/index.js';
import * as defaultBrands from '../brands/index.js';
import type { ProviderEnv, ProviderTemplate } from '../providers/index.js';
import type { CreateVariantResult, DoctorReportItem, UpdateVariantResult, VariantEntry, VariantMeta } from '../core/types.js';
import * as defaultCore from '../core/index.js';
import * as defaultProviders from '../providers/index.js';
import { openUrl } from '../core/open-url.js';

// Import clean screen components
import {
  HomeScreen,
  ProviderSelectScreen,
  ApiKeyScreen,
  SummaryScreen,
  ProgressScreen,
  CompletionScreen,
  VariantListScreen,
  VariantActionsScreen,
  DiagnosticsScreen,
} from './screens/index.js';

// Import legacy components still needed
import {
  YesNoSelect,
  EnvEditor,
} from './components/screens.js';

// Import UI components
import { Frame, Divider, HintBar } from './components/ui/Layout.js';
import { Header, SummaryRow } from './components/ui/Typography.js';
import { TextField } from './components/ui/Input.js';
import { SimpleMenu } from './components/ui/Menu.js';
import { colors } from './components/ui/theme.js';

// Legacy common components
import { Footer, InputStep, Section } from './components/common.js';

export interface CoreModule {
  DEFAULT_ROOT: string;
  DEFAULT_BIN_DIR: string;
  DEFAULT_NPM_PACKAGE: string;
  DEFAULT_NPM_VERSION: string;
  listVariants: (rootDir: string) => VariantEntry[];
  createVariant: (params: {
    name: string;
    providerKey: string;
    baseUrl?: string;
    apiKey?: string;
    extraEnv?: string[];
    modelOverrides?: {
      sonnet?: string;
      opus?: string;
      haiku?: string;
      smallFast?: string;
      defaultModel?: string;
      subagentModel?: string;
    };
    brand?: string;
    rootDir?: string;
    binDir?: string;
    npmPackage?: string;
    noTweak?: boolean;
    promptPack?: boolean;
    promptPackMode?: 'minimal' | 'maximal';
    skillInstall?: boolean;
    shellEnv?: boolean;
    skillUpdate?: boolean;
    tweakccStdio?: 'pipe' | 'inherit';
    onProgress?: (step: string) => void;
  }) => CreateVariantResult;
  updateVariant: (
    rootDir: string,
    name: string,
    opts?: {
      tweakccStdio?: 'pipe' | 'inherit';
      binDir?: string;
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
      onProgress?: (step: string) => void;
    }
  ) => UpdateVariantResult;
  tweakVariant: (rootDir: string, name: string) => void;
  removeVariant: (rootDir: string, name: string) => void;
  doctor: (rootDir: string, binDir: string) => DoctorReportItem[];
  createVariantAsync?: (params: {
    name: string;
    providerKey: string;
    baseUrl?: string;
    apiKey?: string;
    extraEnv?: string[];
    modelOverrides?: {
      sonnet?: string;
      opus?: string;
      haiku?: string;
      smallFast?: string;
      defaultModel?: string;
      subagentModel?: string;
    };
    brand?: string;
    rootDir?: string;
    binDir?: string;
    npmPackage?: string;
    noTweak?: boolean;
    promptPack?: boolean;
    promptPackMode?: 'minimal' | 'maximal';
    skillInstall?: boolean;
    shellEnv?: boolean;
    skillUpdate?: boolean;
    tweakccStdio?: 'pipe' | 'inherit';
    onProgress?: (step: string) => void;
  }) => Promise<CreateVariantResult>;
  updateVariantAsync?: (
    rootDir: string,
    name: string,
    opts?: {
      tweakccStdio?: 'pipe' | 'inherit';
      binDir?: string;
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
      onProgress?: (step: string) => void;
    }
  ) => Promise<UpdateVariantResult>;
}

export interface ProvidersModule {
  listProviders: (includeExperimental?: boolean) => ProviderTemplate[];
  getProvider: (key: string) => ProviderTemplate | undefined;
  buildEnv: (params: {
    providerKey: string;
    baseUrl?: string;
    apiKey?: string;
    extraEnv?: string[];
    modelOverrides?: {
      sonnet?: string;
      opus?: string;
      haiku?: string;
      smallFast?: string;
      defaultModel?: string;
      subagentModel?: string;
    };
  }) => ProviderEnv;
}

export interface BrandsModule {
  listBrandPresets: () => BrandPreset[];
}

export interface AppProps {
  core?: CoreModule;
  providers?: ProvidersModule;
  brands?: BrandsModule;
  initialRootDir?: string;
  initialBinDir?: string;
}

export const App: React.FC<AppProps> = ({
  core = defaultCore,
  providers = defaultProviders,
  brands = defaultBrands,
  initialRootDir,
  initialBinDir,
}: AppProps = {}) => {
  // No splash screen for clean UI
  const [screen, setScreen] = useState('home');
  const [providerKey, setProviderKey] = useState<string | null>(null);
  const [brandKey, setBrandKey] = useState('auto');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelSonnet, setModelSonnet] = useState('');
  const [modelOpus, setModelOpus] = useState('');
  const [modelHaiku, setModelHaiku] = useState('');
  const [rootDir, setRootDir] = useState(initialRootDir || core.DEFAULT_ROOT);
  const [binDir, setBinDir] = useState(initialBinDir || core.DEFAULT_BIN_DIR);
  const [npmPackage, setNpmPackage] = useState(core.DEFAULT_NPM_PACKAGE || '@anthropic-ai/claude-code');
  const npmVersion = core.DEFAULT_NPM_VERSION || '2.0.76';
  const [useTweak, setUseTweak] = useState(true);
  const [usePromptPack, setUsePromptPack] = useState(true);
  const [promptPackMode, setPromptPackMode] = useState<'minimal' | 'maximal'>('maximal');
  const [installSkill, setInstallSkill] = useState(true);
  const [shellEnv, setShellEnv] = useState(true);
  const [skillUpdate, setSkillUpdate] = useState(false);
  const [extraEnv, setExtraEnv] = useState<string[]>([]);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [doneLines, setDoneLines] = useState<string[]>([]);
  const [completionSummary, setCompletionSummary] = useState<string[]>([]);
  const [completionNextSteps, setCompletionNextSteps] = useState<string[]>([]);
  const [completionHelp, setCompletionHelp] = useState<string[]>([]);
  const [completionShareUrl, setCompletionShareUrl] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantEntry[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<(VariantMeta & { wrapperPath: string }) | null>(null);
  const [doctorReport, setDoctorReport] = useState<DoctorReportItem[]>([]);
  const [apiKeyDetectedFrom, setApiKeyDetectedFrom] = useState<string | null>(null);

  // Include experimental providers to show "Coming Soon" in UI
  const providerList = useMemo(() => providers.listProviders(true), [providers]);
  const brandList = useMemo(() => brands.listBrandPresets(), [brands]);
  const provider = useMemo(
    () => (providerKey ? providers.getProvider(providerKey) : null),
    [providerKey, providers]
  );
  const effectiveBaseUrl = useMemo(
    () => baseUrl || provider?.baseUrl || '',
    [baseUrl, provider]
  );
  const modelOverrides = useMemo(
    () => ({
      sonnet: modelSonnet.trim() || undefined,
      opus: modelOpus.trim() || undefined,
      haiku: modelHaiku.trim() || undefined,
    }),
    [modelSonnet, modelOpus, modelHaiku]
  );

  const providerDefaults = (key?: string | null): {
    promptPack: boolean;
    promptPackMode: 'minimal' | 'maximal';
    skillInstall: boolean;
    shellEnv: boolean;
  } => ({
    promptPack: key === 'zai' || key === 'minimax',
    promptPackMode: key === 'zai' || key === 'minimax' ? 'maximal' : 'minimal',
    skillInstall: key === 'zai' || key === 'minimax',
    shellEnv: key === 'zai',
  });

  const resolveZaiApiKey = (): {
    value: string;
    detectedFrom: string | null;
    skipPrompt: boolean;
  } => {
    const zaiKey = process.env.Z_AI_API_KEY?.trim();
    if (zaiKey) {
      return { value: zaiKey, detectedFrom: 'Z_AI_API_KEY', skipPrompt: true };
    }
    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (anthropicKey) {
      return { value: anthropicKey, detectedFrom: 'ANTHROPIC_API_KEY', skipPrompt: false };
    }
    return { value: '', detectedFrom: null, skipPrompt: false };
  };

  useInput((input, key) => {
    if (key.escape) {
      // ESC key navigation - handle all screens
      switch (screen) {
        case 'home':
          setScreen('exit');
          break;
        // Quick setup flow - back steps
        case 'quick-api-key':
          setScreen('quick-provider');
          break;
        case 'quick-model-opus':
          setScreen('quick-api-key');
          break;
        case 'quick-model-sonnet':
          setScreen('quick-model-opus');
          break;
        case 'quick-model-haiku':
          setScreen('quick-model-sonnet');
          break;
        case 'quick-name':
          setScreen(provider?.requiresModelMapping ? 'quick-model-haiku' : 'quick-api-key');
          break;
        case 'quick-provider':
          setScreen('home');
          break;
        case 'create-model-opus':
          setScreen('create-api-key');
          break;
        case 'create-model-sonnet':
          setScreen('create-model-opus');
          break;
        case 'create-model-haiku':
          setScreen('create-model-sonnet');
          break;
        // Settings - back to home
        case 'settings-root':
        case 'settings-bin':
          setScreen('home');
          break;
        // Model configuration screens - back through flow
        case 'manage-models-opus':
          setScreen('manage-actions');
          break;
        case 'manage-models-sonnet':
          setScreen('manage-models-opus');
          break;
        case 'manage-models-haiku':
          setScreen('manage-models-sonnet');
          break;
        case 'manage-models-done':
          setScreen('manage-actions');
          break;
        // Completion/done screens - back to home
        case 'create-done':
        case 'manage-update-done':
        case 'manage-tweak-done':
        case 'manage-remove-done':
        case 'updateAll-done':
          setScreen('home');
          break;
        // Doctor screen - home
        case 'doctor':
          setScreen('home');
          break;
        // Default: any screen starting with create, manage, or updateAll goes home
        default:
          if (screen.startsWith('create') || screen.startsWith('manage') || screen.startsWith('updateAll')) {
            setScreen('home');
          }
          break;
      }
    }
  });

  useEffect(() => {
    if (screen === 'manage') {
      setVariants(core.listVariants(rootDir));
    }
  }, [screen, rootDir, core]);

  useEffect(() => {
    if (screen !== 'doctor') return;
    setDoctorReport(core.doctor(rootDir, binDir));
  }, [screen, rootDir, binDir, core]);

  useEffect(() => {
    if (screen !== 'create-running') return;
    let cancelled = false;

    const runCreate = async () => {
      try {
        setProgressLines([]);
        const params = {
          name,
          providerKey: providerKey || 'zai',
          baseUrl: effectiveBaseUrl,
          apiKey,
          extraEnv,
          modelOverrides,
          brand: brandKey,
          rootDir,
          binDir,
          npmPackage,
          noTweak: !useTweak,
          promptPack: usePromptPack,
          promptPackMode,
          skillInstall: installSkill,
          shellEnv,
          skillUpdate,
          tweakccStdio: 'pipe' as const,
          onProgress: (step: string) => setProgressLines(prev => [...prev, step]),
        };
        // Use async version if available for live progress updates
        const result = core.createVariantAsync
          ? await core.createVariantAsync(params)
          : core.createVariant(params);
        if (cancelled) return;
        const wrapper = result.wrapperPath;
        const providerLabel = provider?.label || providerKey || 'Provider';
        const summary = [
          `Provider: ${providerLabel}`,
          `Install: npm ${npmPackage}@${npmVersion}`,
          `Prompt pack: ${usePromptPack ? `on (${promptPackMode})` : 'off'}`,
          `dev-browser skill: ${installSkill ? 'on' : 'off'}`,
          ...(modelOverrides.sonnet || modelOverrides.opus || modelOverrides.haiku
            ? [
                `Models: sonnet=${modelOverrides.sonnet || '-'}, opus=${modelOverrides.opus || '-'}, haiku=${modelOverrides.haiku || '-'}`,
              ]
            : []),
          ...(providerKey === 'zai' ? [`Shell env: ${shellEnv ? 'write Z_AI_API_KEY' : 'manual'}`] : []),
          ...(result.notes || []),
        ];
        const nextSteps = [
          `Run: ${name}`,
          `Update: cc-mirror update ${name}`,
          `Tweak: cc-mirror tweak ${name}`,
          `Config: ${path.join(rootDir, name, 'config', 'settings.json')}`,
        ];
        const help = ['Help: cc-mirror help', 'List: cc-mirror list', 'Doctor: cc-mirror doctor'];
        setCompletionSummary(summary);
        setCompletionNextSteps(nextSteps);
        setCompletionHelp(help);
        setCompletionShareUrl(buildShareUrl(providerLabel, name, usePromptPack ? promptPackMode : undefined));
        setShareStatus(null);
        setDoneLines([
          `Variant created: ${name}`,
          `Wrapper: ${wrapper}`,
          `Config: ${path.join(rootDir, name, 'config')}`,
        ]);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setDoneLines([`Failed: ${message}`]);
        setCompletionSummary([]);
        setCompletionNextSteps([]);
        setCompletionHelp([]);
        setCompletionShareUrl(null);
        setShareStatus(null);
      }
      if (!cancelled) setScreen('create-done');
    };

    runCreate();
    return () => { cancelled = true; };
  }, [
    screen,
    name,
    providerKey,
    effectiveBaseUrl,
    apiKey,
    extraEnv,
    modelOverrides,
    brandKey,
    rootDir,
    binDir,
    npmPackage,
    npmVersion,
    useTweak,
    usePromptPack,
    promptPackMode,
    installSkill,
    shellEnv,
    provider,
    skillUpdate,
    core,
  ]);

  useEffect(() => {
    if (screen !== 'manage-update') return;
    if (!selectedVariant) return;
    let cancelled = false;

    const runUpdate = async () => {
      try {
        setProgressLines([]);
        const opts = {
          tweakccStdio: 'pipe' as const,
          binDir,
          onProgress: (step: string) => setProgressLines(prev => [...prev, step]),
        };
        // Use async version if available for live progress updates
        const result = core.updateVariantAsync
          ? await core.updateVariantAsync(rootDir, selectedVariant.name, opts)
          : core.updateVariant(rootDir, selectedVariant.name, opts);
        if (cancelled) return;
        const meta = result.meta;
        const summary = [
          `Provider: ${meta.provider}`,
          `Prompt pack: ${meta.promptPack ? `on (${meta.promptPackMode || 'maximal'})` : 'off'}`,
          `dev-browser skill: ${meta.skillInstall ? 'on' : 'off'}`,
          ...(meta.provider === 'zai' ? [`Shell env: ${meta.shellEnv ? 'write Z_AI_API_KEY' : 'manual'}`] : []),
          ...(result.notes || []),
        ];
        const nextSteps = [
          `Run: ${selectedVariant.name}`,
          `Tweak: cc-mirror tweak ${selectedVariant.name}`,
          `Config: ${path.join(rootDir, selectedVariant.name, 'config', 'settings.json')}`,
        ];
        const help = ['Help: cc-mirror help', 'List: cc-mirror list', 'Doctor: cc-mirror doctor'];
        setCompletionSummary(summary);
        setCompletionNextSteps(nextSteps);
        setCompletionHelp(help);
        setCompletionShareUrl(null);
        setShareStatus(null);
        setDoneLines([`Updated ${selectedVariant.name}`]);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setDoneLines([`Failed: ${message}`]);
        setCompletionSummary([]);
        setCompletionNextSteps([]);
        setCompletionHelp([]);
        setCompletionShareUrl(null);
        setShareStatus(null);
      }
      if (!cancelled) setScreen('manage-update-done');
    };

    runUpdate();
    return () => { cancelled = true; };
  }, [screen, selectedVariant, rootDir, binDir, core]);

  useEffect(() => {
    if (screen !== 'manage-tweak') return;
    if (!selectedVariant) return;
    // Can't launch tweakcc from within TUI (both are ink apps that conflict)
    // Show user the command to run instead
    setDoneLines([`To customize ${selectedVariant.name}, run:`]);
    setCompletionSummary([`cc-mirror tweak ${selectedVariant.name}`]);
    setCompletionNextSteps([
      'Exit this TUI first (press ESC or q)',
      'Then run the command above in your terminal',
    ]);
    setCompletionHelp(['tweakcc lets you customize themes, overlays, and more']);
    setCompletionShareUrl(null);
    setShareStatus(null);
    setScreen('manage-tweak-done');
  }, [screen, selectedVariant]);

  // Save model configuration for existing variant
  useEffect(() => {
    if (screen !== 'manage-models-saving') return;
    if (!selectedVariant) return;
    let cancelled = false;

    const saveModels = async () => {
      try {
        setProgressLines(['Saving model configuration...']);
        const opts = {
          tweakccStdio: 'pipe' as const,
          binDir,
          noTweak: true, // Don't re-run tweakcc, just update settings
          modelOverrides: {
            opus: modelOpus.trim() || undefined,
            sonnet: modelSonnet.trim() || undefined,
            haiku: modelHaiku.trim() || undefined,
          },
          onProgress: (step: string) => setProgressLines(prev => [...prev, step]),
        };
        // Use async version if available
        if (core.updateVariantAsync) {
          await core.updateVariantAsync(rootDir, selectedVariant.name, opts);
        } else {
          core.updateVariant(rootDir, selectedVariant.name, opts);
        }
        if (cancelled) return;
        setDoneLines([`Updated model mapping for ${selectedVariant.name}`]);
        setCompletionSummary([
          `Opus: ${modelOpus.trim() || '(not set)'}`,
          `Sonnet: ${modelSonnet.trim() || '(not set)'}`,
          `Haiku: ${modelHaiku.trim() || '(not set)'}`,
        ]);
        setCompletionNextSteps([
          `Run: ${selectedVariant.name}`,
          'Models are saved in settings.json',
        ]);
        setCompletionHelp(['Use "Update" to refresh binary while keeping models']);
        setCompletionShareUrl(null);
        setShareStatus(null);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setDoneLines([`Failed: ${message}`]);
        setCompletionSummary([]);
        setCompletionNextSteps([]);
        setCompletionHelp([]);
        setCompletionShareUrl(null);
        setShareStatus(null);
      }
      if (!cancelled) setScreen('manage-models-done');
    };

    saveModels();
    return () => { cancelled = true; };
  }, [screen, selectedVariant, rootDir, binDir, modelOpus, modelSonnet, modelHaiku, core]);

  useEffect(() => {
    if (screen !== 'updateAll') return;
    let cancelled = false;

    const runUpdateAll = async () => {
      const entries = core.listVariants(rootDir);
      if (entries.length === 0) {
        setDoneLines(['No variants found.']);
        setCompletionSummary([]);
        setCompletionNextSteps([]);
        setCompletionHelp([]);
        setCompletionShareUrl(null);
        setShareStatus(null);
        setScreen('updateAll-done');
        return;
      }
      setProgressLines([]);
      try {
        for (const entry of entries) {
          if (cancelled) return;
          setProgressLines(prev => [...prev, `━━ ${entry.name} ━━`]);
          const opts = {
            tweakccStdio: 'pipe' as const,
            binDir,
            onProgress: (step: string) => setProgressLines(prev => [...prev, `  ${step}`]),
          };
          // Use async version if available for live progress updates
          if (core.updateVariantAsync) {
            await core.updateVariantAsync(rootDir, entry.name, opts);
          } else {
            core.updateVariant(rootDir, entry.name, opts);
          }
        }
        if (cancelled) return;
        setCompletionSummary([`Updated ${entries.length} variants.`]);
        setCompletionNextSteps(['Run any variant by name', 'Use Manage Variants to inspect details']);
        setCompletionHelp(['Help: cc-mirror help', 'List: cc-mirror list', 'Doctor: cc-mirror doctor']);
        setCompletionShareUrl(null);
        setShareStatus(null);
        setDoneLines(['All variants updated.']);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setDoneLines([`Failed: ${message}`]);
        setCompletionSummary([]);
        setCompletionNextSteps([]);
        setCompletionHelp([]);
        setCompletionShareUrl(null);
        setShareStatus(null);
      }
      if (!cancelled) setScreen('updateAll-done');
    };

    runUpdateAll();
    return () => { cancelled = true; };
  }, [screen, rootDir, binDir, core]);

  const resetWizard = () => {
    setProviderKey(null);
    setBrandKey('auto');
    setName('');
    setBaseUrl('');
    setApiKey('');
    setModelSonnet('');
    setModelOpus('');
    setModelHaiku('');
    setApiKeyDetectedFrom(null);
    setNpmPackage(core.DEFAULT_NPM_PACKAGE || '@anthropic-ai/claude-code');
    setExtraEnv([]);
    setUseTweak(true);
    setUsePromptPack(true);
    setPromptPackMode('maximal');
    setInstallSkill(true);
    setShellEnv(true);
    setSkillUpdate(false);
    setCompletionSummary([]);
    setCompletionNextSteps([]);
    setCompletionHelp([]);
    setCompletionShareUrl(null);
    setShareStatus(null);
  };

  const envPreview = useMemo(() => {
    if (!providerKey) return [];
    const env = providers.buildEnv({
      providerKey,
      baseUrl: effectiveBaseUrl,
      apiKey,
      extraEnv,
      modelOverrides,
    });
    return Object.entries(env).map(([key, value]) => `${key}=${value}`);
  }, [providerKey, effectiveBaseUrl, apiKey, extraEnv, modelOverrides, providers]);

  const buildShareUrl = (label: string, variant: string, mode?: 'minimal' | 'maximal') => {
    const lines = [
      `Just set up ${label} with cc-mirror`,
      mode ? `Prompt pack: ${mode}` : 'Prompt pack: enabled',
      `CLI: ${variant}`,
      'Get yours: npx cc-mirror',
      '(Attach your TUI screenshot)',
    ];
    const url = new URL('https://x.com/intent/tweet');
    url.searchParams.set('text', lines.join('\n'));
    return url.toString();
  };

  // Exit screen
  if (screen === 'exit') {
    return (
      <Frame>
        <Header title="CC-MIRROR" subtitle="Goodbye. Happy coding!" />
      </Frame>
    );
  }

  if (screen === 'home') {
    return (
      <HomeScreen
        onSelect={value => {
          if (value === 'quick') {
            resetWizard();
            setUseTweak(true);
            setScreen('quick-provider');
          }
          if (value === 'create') {
            resetWizard();
            setScreen('create-provider');
          }
          if (value === 'manage') setScreen('manage');
          if (value === 'updateAll') setScreen('updateAll');
          if (value === 'doctor') setScreen('doctor');
          if (value === 'settings') setScreen('settings-root');
          if (value === 'exit') setScreen('exit');
        }}
      />
    );
  }

  if (screen === 'quick-provider') {
    return (
      <ProviderSelectScreen
        providers={providerList}
        onSelect={value => {
          const selected = providers.getProvider(value);
          const defaults = providerDefaults(value);
          const keyDefaults = value === 'zai' ? resolveZaiApiKey() : { value: '', detectedFrom: null, skipPrompt: false };
          const requiresModels = Boolean(selected?.requiresModelMapping);
          setProviderKey(value);
          setName(value);
          setBaseUrl(selected?.baseUrl || '');
          setApiKey(keyDefaults.value);
          setApiKeyDetectedFrom(keyDefaults.detectedFrom);
          setModelSonnet('');
          setModelOpus('');
          setModelHaiku('');
          setExtraEnv([]);
          setBrandKey('auto');
          setUseTweak(true);
          setUsePromptPack(defaults.promptPack);
          setPromptPackMode(defaults.promptPackMode);
          setInstallSkill(defaults.skillInstall);
          setShellEnv(keyDefaults.detectedFrom === 'Z_AI_API_KEY' ? false : defaults.shellEnv);
          if (keyDefaults.skipPrompt) {
            setScreen(requiresModels ? 'quick-model-opus' : 'quick-name');
          } else {
            setScreen('quick-api-key');
          }
        }}
      />
    );
  }

  if (screen === 'quick-api-key') {
    return (
      <ApiKeyScreen
        providerLabel={provider?.label || 'Provider'}
        providerKey={providerKey || undefined}
        envVarName={provider?.authMode === 'authToken' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY'}
        value={apiKey}
        onChange={setApiKey}
        onSubmit={() =>
          setScreen(provider?.requiresModelMapping ? 'quick-model-opus' : 'quick-name')
        }
        detectedFrom={apiKeyDetectedFrom || undefined}
      />
    );
  }

  // Model mapping screens - order: Opus -> Sonnet -> Haiku (most capable to least)
  // These map Claude's internal model names to your provider's model identifiers
  if (screen === 'quick-model-opus') {
    return (
      <Frame>
        <Header title="Model Mapping (1/3)" subtitle="Configure which models to use" />
        <Divider />
        <Box flexDirection="column" marginY={1}>
          <Box marginBottom={1}>
            <Text color={colors.textMuted}>
              Claude Code uses model aliases like "opus", "sonnet", "haiku".{'\n'}
              Map these to your provider's actual model names.
            </Text>
          </Box>
          <TextField
            label="Opus model (most capable)"
            value={modelOpus}
            onChange={setModelOpus}
            onSubmit={() => {
              if (!modelOpus.trim()) return;
              setScreen('quick-model-sonnet');
            }}
            placeholder={providerKey === 'openrouter' ? 'anthropic/claude-3-opus' : 'deepseek,deepseek-reasoner'}
            hint="Used for complex reasoning tasks"
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'quick-model-sonnet') {
    return (
      <Frame>
        <Header title="Model Mapping (2/3)" subtitle="Configure which models to use" />
        <Divider />
        <Box flexDirection="column" marginY={1}>
          <TextField
            label="Sonnet model (balanced)"
            value={modelSonnet}
            onChange={setModelSonnet}
            onSubmit={() => {
              if (!modelSonnet.trim()) return;
              setScreen('quick-model-haiku');
            }}
            placeholder={providerKey === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : 'deepseek,deepseek-chat'}
            hint="Default model for most tasks"
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'quick-model-haiku') {
    return (
      <Frame>
        <Header title="Model Mapping (3/3)" subtitle="Configure which models to use" />
        <Divider />
        <Box flexDirection="column" marginY={1}>
          <TextField
            label="Haiku model (fastest)"
            value={modelHaiku}
            onChange={setModelHaiku}
            onSubmit={() => {
              if (!modelHaiku.trim()) return;
              setScreen('quick-name');
            }}
            placeholder={providerKey === 'openrouter' ? 'anthropic/claude-3-haiku' : 'ollama,qwen2.5-coder:latest'}
            hint="Used for quick tasks and subagents"
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'quick-name') {
    return (
      <Frame>
        <Header title="Variant Name" subtitle="This becomes the CLI command name" />
        <Divider />
        {apiKeyDetectedFrom && (
          <Box marginTop={1}>
            <Text color={colors.success}>
              Detected API key from {apiKeyDetectedFrom}.
            </Text>
          </Box>
        )}
        <Box marginY={1}>
          <TextField
            label="Command name"
            value={name}
            onChange={setName}
            onSubmit={() => {
              setProgressLines([]);
              setScreen('create-running');
            }}
            placeholder={providerKey || 'my-variant'}
            hint="Press Enter to continue"
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'settings-root') {
    return (
      <Frame>
        <Header title="Settings" subtitle="Configure default paths" />
        <Divider />
        <Box marginY={1}>
          <TextField
            label="Default variants root"
            value={rootDir}
            onChange={setRootDir}
            onSubmit={() => setScreen('settings-bin')}
            hint="Used by Manage/Update/Doctor screens"
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'settings-bin') {
    return (
      <Frame>
        <Header title="Settings" subtitle="Configure default paths" />
        <Divider />
        <Box marginY={1}>
          <TextField
            label="Default wrapper bin dir"
            value={binDir}
            onChange={setBinDir}
            onSubmit={() => setScreen('home')}
            hint="Used when installing or checking wrappers"
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'create-provider') {
    return (
      <ProviderSelectScreen
        providers={providerList}
        onSelect={value => {
          const selected = providers.getProvider(value);
          const defaults = providerDefaults(value);
          const keyDefaults = value === 'zai' ? resolveZaiApiKey() : { value: '', detectedFrom: null, skipPrompt: false };
          setProviderKey(value);
          setName(value);
          setBaseUrl(selected?.baseUrl || '');
          setApiKey(keyDefaults.value);
          setApiKeyDetectedFrom(keyDefaults.detectedFrom);
          setModelSonnet('');
          setModelOpus('');
          setModelHaiku('');
          setExtraEnv([]);
          setBrandKey('auto');
          setUsePromptPack(defaults.promptPack);
          setPromptPackMode(defaults.promptPackMode);
          setInstallSkill(defaults.skillInstall);
          setShellEnv(keyDefaults.detectedFrom === 'Z_AI_API_KEY' ? false : defaults.shellEnv);
          setScreen('create-brand');
        }}
      />
    );
  }

  if (screen === 'create-brand') {
    const items = [
      { label: 'Auto (match provider)', value: 'auto' },
      { label: 'None (keep default Claude Code look)', value: 'none' },
      ...brandList.map(brand => ({
        label: `${brand.label} - ${brand.description}`,
        value: brand.key,
      })),
    ];
    return (
      <Box flexDirection="column">
        <Header title="Choose a brand preset" subtitle="Optional: re-skin the UI with tweakcc presets." />
        <Section title="Brand presets">
          <SelectInput
            items={items}
            onSelect={item => {
              setBrandKey(item.value as string);
              setScreen('create-name');
            }}
          />
        </Section>
        <Footer hint="Pick a style preset or press Esc to go back." />
      </Box>
    );
  }

  if (screen === 'create-name') {
    return (
      <InputStep
        label="Variant name"
        hint="This becomes the CLI command name."
        value={name}
        onChange={setName}
        onSubmit={() => setScreen('create-base-url')}
      />
    );
  }

  if (screen === 'create-base-url') {
    const skipApiKey = providerKey === 'zai' && apiKeyDetectedFrom === 'Z_AI_API_KEY';
    return (
      <InputStep
        label="ANTHROPIC_BASE_URL"
        hint="Leave blank to keep provider defaults."
        value={baseUrl}
        onChange={setBaseUrl}
        onSubmit={() =>
          setScreen(
            skipApiKey
              ? provider?.requiresModelMapping
                ? 'create-model-sonnet'
                : 'create-root'
              : 'create-api-key'
          )
        }
      />
    );
  }

  if (screen === 'create-api-key') {
    return (
      <ApiKeyScreen
        providerLabel={provider?.label || 'Provider'}
        providerKey={providerKey || undefined}
        envVarName={provider?.authMode === 'authToken' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY'}
        value={apiKey}
        onChange={setApiKey}
        onSubmit={() =>
          setScreen(provider?.requiresModelMapping ? 'create-model-opus' : 'create-root')
        }
        detectedFrom={apiKeyDetectedFrom || undefined}
      />
    );
  }

  // Advanced create - model mapping (Opus -> Sonnet -> Haiku)
  if (screen === 'create-model-opus') {
    return (
      <InputStep
        label="Opus model (most capable)"
        hint="For complex reasoning. Example: anthropic/claude-3-opus"
        value={modelOpus}
        onChange={setModelOpus}
        onSubmit={() => {
          if (!modelOpus.trim()) return;
          setScreen('create-model-sonnet');
        }}
      />
    );
  }

  if (screen === 'create-model-sonnet') {
    return (
      <InputStep
        label="Sonnet model (balanced)"
        hint="Default for most tasks. Example: anthropic/claude-3.5-sonnet"
        value={modelSonnet}
        onChange={setModelSonnet}
        onSubmit={() => {
          if (!modelSonnet.trim()) return;
          setScreen('create-model-haiku');
        }}
      />
    );
  }

  if (screen === 'create-model-haiku') {
    return (
      <InputStep
        label="Haiku model (fastest)"
        hint="For quick tasks and subagents. Example: anthropic/claude-3-haiku"
        value={modelHaiku}
        onChange={setModelHaiku}
        onSubmit={() => {
          if (!modelHaiku.trim()) return;
          setScreen('create-root');
        }}
      />
    );
  }

  if (screen === 'create-root') {
    return (
      <InputStep
        label="Variants root directory"
        hint="Default: ~/.cc-mirror"
        value={rootDir}
        onChange={setRootDir}
        onSubmit={() => setScreen('create-bin')}
      />
    );
  }

  if (screen === 'create-bin') {
    return (
      <InputStep
        label="Wrapper install directory"
        hint="Default: ~/.local/bin"
        value={binDir}
        onChange={setBinDir}
        onSubmit={() => setScreen('create-tweak')}
      />
    );
  }

  if (screen === 'create-tweak') {
    // Prompt packs only available for zai and minimax
    const supportsPromptPack = providerKey === 'zai' || providerKey === 'minimax';
    return (
      <Box flexDirection="column">
        <Header title="Apply tweakcc?" subtitle="tweakcc patches the binary copy safely." />
        <YesNoSelect
          title="Use tweakcc patches"
          onSelect={value => {
            setUseTweak(value);
            if (!value || !supportsPromptPack) {
              setUsePromptPack(false);
              setScreen('create-skill-install');
            } else {
              setScreen('create-prompt-pack');
            }
          }}
        />
      </Box>
    );
  }

  if (screen === 'create-prompt-pack') {
    return (
      <Box flexDirection="column">
        <Header title="Provider prompt pack" subtitle="Default-on provider hints for tools + behavior." />
        <YesNoSelect
          title="Apply provider prompt pack?"
          onSelect={value => {
            setUsePromptPack(value);
            if (value) {
              setScreen('create-prompt-pack-mode');
            } else {
              setScreen('create-skill-install');
            }
          }}
        />
      </Box>
    );
  }

  if (screen === 'create-prompt-pack-mode') {
    const items = [
      { label: 'Minimal', value: 'minimal' },
      { label: 'Maximal (recommended)', value: 'maximal' },
    ];
    return (
      <Box flexDirection="column">
        <Header title="Prompt pack mode" subtitle="Minimal keeps tweaks small; maximal enables expert mode." />
        <Section title="Mode">
          <SelectInput
            items={items}
            initialIndex={promptPackMode === 'minimal' ? 0 : 1}
            onSelect={item => {
              setPromptPackMode(item.value as 'minimal' | 'maximal');
              setScreen('create-skill-install');
            }}
          />
        </Section>
        <Footer hint="Select a prompt pack mode or press Esc to go back." />
      </Box>
    );
  }

  if (screen === 'create-skill-install') {
    return (
      <Box flexDirection="column">
        <Header
          title="Install dev-browser skill"
          subtitle="Adds the dev-browser skill to this variant's config (…/config/skills)."
        />
        <YesNoSelect
          title="Install dev-browser skill?"
          onSelect={value => {
            setInstallSkill(value);
            if (providerKey === 'zai') {
              if (apiKeyDetectedFrom === 'Z_AI_API_KEY') {
                setShellEnv(false);
                setScreen('create-env-confirm');
              } else {
                setScreen('create-shell-env');
              }
            } else {
              setScreen('create-env-confirm');
            }
          }}
        />
      </Box>
    );
  }

  if (screen === 'create-shell-env') {
    return (
      <Box flexDirection="column">
        <Header
          title="Set Z_AI_API_KEY"
          subtitle="Optional: write to your shell profile for Z.ai CLI tools."
        />
        <YesNoSelect
          title="Write Z_AI_API_KEY to your shell profile?"
          onSelect={value => {
            setShellEnv(value);
            setScreen('create-env-confirm');
          }}
        />
      </Box>
    );
  }

  if (screen === 'create-env-confirm') {
    return (
      <Box flexDirection="column">
        <Header title="Custom environment variables" subtitle="Optional extras beyond the template." />
        <YesNoSelect
          title="Add custom env entries?"
          onSelect={value => {
            if (value) {
              setScreen('create-env-add');
            } else {
              setScreen('create-summary');
            }
          }}
        />
      </Box>
    );
  }

  if (screen === 'create-env-add') {
    return (
      <EnvEditor
        envEntries={extraEnv}
        onAdd={entry => setExtraEnv(prev => [...prev, entry])}
        onDone={() => setScreen('create-summary')}
      />
    );
  }

  if (screen === 'create-summary') {
    const providerLabel = provider?.label || providerKey || '';
    const brandPreset = brandList.find(item => item.key === brandKey);
    const brandLabel =
      brandKey === 'auto'
        ? 'Auto (match provider)'
        : brandKey === 'none'
          ? 'None'
          : brandPreset?.label || brandKey;
    return (
      <SummaryScreen
        data={{
          name,
          providerLabel,
          brandLabel,
          baseUrl: effectiveBaseUrl,
          apiKey,
          apiKeySource: apiKeyDetectedFrom || undefined,
          modelSonnet: modelOverrides.sonnet,
          modelOpus: modelOverrides.opus,
          modelHaiku: modelOverrides.haiku,
          rootDir,
          binDir,
          npmPackage,
          npmVersion,
          useTweak,
          usePromptPack,
          promptPackMode,
          installSkill,
          shellEnv,
        }}
        onConfirm={() => {
          setProgressLines([]);
          setScreen('create-running');
        }}
        onBack={() => setScreen('create-env-confirm')}
        onCancel={() => setScreen('home')}
      />
    );
  }

  if (screen === 'create-running') {
    return <ProgressScreen title="Creating variant" lines={progressLines} variantName={name} />;
  }

  if (screen === 'create-done') {
    return (
      <CompletionScreen
        title="Create variant"
        lines={doneLines}
        variantName={name}
        wrapperPath={`${binDir}/${name}`}
        configPath={`${rootDir}/${name}/config`}
        variantPath={`${rootDir}/${name}`}
        summary={completionSummary}
        nextSteps={completionNextSteps}
        help={completionHelp}
        shareUrl={completionShareUrl || undefined}
        shareStatus={shareStatus}
        onDone={value => {
          if (value === 'share' && completionShareUrl) {
            const opened = openUrl(completionShareUrl);
            setShareStatus(
              opened
                ? 'Opened X. Paste your TUI screenshot into the post.'
                : `Could not open browser. Copy this URL: ${completionShareUrl}`
            );
            return;
          }
          if (value === 'home') setScreen('home');
          else setScreen('exit');
        }}
      />
    );
  }

  if (screen === 'manage') {
    return (
      <VariantListScreen
        variants={variants.map(v => ({
          name: v.name,
          provider: v.meta?.provider,
          wrapperPath: path.join(binDir, v.name),
        }))}
        onSelect={variantName => {
          const entry = variants.find(item => item.name === variantName);
          if (!entry || !entry.meta) return;
          setSelectedVariant({ ...entry.meta, wrapperPath: path.join(binDir, entry.name) });
          setScreen('manage-actions');
        }}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'manage-actions' && selectedVariant) {
    return (
      <VariantActionsScreen
        meta={selectedVariant}
        onUpdate={() => setScreen('manage-update')}
        onConfigureModels={() => {
          // Reset model inputs and start model configuration
          setModelOpus('');
          setModelSonnet('');
          setModelHaiku('');
          setScreen('manage-models-opus');
        }}
        onTweak={() => setScreen('manage-tweak')}
        onRemove={() => setScreen('manage-remove')}
        onBack={() => setScreen('manage')}
      />
    );
  }

  if (screen === 'manage-update' && selectedVariant) {
    return <ProgressScreen title="Updating variant" lines={progressLines} />;
  }

  if (screen === 'manage-update-done') {
    return (
      <CompletionScreen
        title="Update variant"
        lines={doneLines}
        summary={completionSummary}
        nextSteps={completionNextSteps}
        help={completionHelp}
        shareStatus={shareStatus}
        onDone={value => {
          if (value === 'home') setScreen('home');
          else setScreen('exit');
        }}
      />
    );
  }

  if (screen === 'manage-tweak' && selectedVariant) {
    return <ProgressScreen title="Launching tweakcc" lines={progressLines} />;
  }

  if (screen === 'manage-tweak-done') {
    return (
      <CompletionScreen
        title="tweakcc session"
        lines={doneLines}
        summary={completionSummary}
        nextSteps={completionNextSteps}
        help={completionHelp}
        shareStatus={shareStatus}
        onDone={value => {
          if (value === 'home') setScreen('home');
          else setScreen('exit');
        }}
      />
    );
  }

  // Model configuration screens for existing variants
  if (screen === 'manage-models-opus' && selectedVariant) {
    return (
      <Frame>
        <Header title="Configure Models (1/3)" subtitle={`Update model mapping for ${selectedVariant.name}`} />
        <Divider />
        <Box flexDirection="column" marginY={1}>
          <Box marginBottom={1}>
            <Text color={colors.textMuted}>
              Map Claude Code's model aliases to your provider's models.{'\n'}
              These settings will be saved to the variant's configuration.
            </Text>
          </Box>
          <TextField
            label="Opus model (most capable)"
            value={modelOpus}
            onChange={setModelOpus}
            onSubmit={() => setScreen('manage-models-sonnet')}
            placeholder={selectedVariant.provider === 'openrouter' ? 'anthropic/claude-3-opus' : 'deepseek,deepseek-reasoner'}
            hint="Used for complex reasoning tasks"
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'manage-models-sonnet' && selectedVariant) {
    return (
      <Frame>
        <Header title="Configure Models (2/3)" subtitle={`Update model mapping for ${selectedVariant.name}`} />
        <Divider />
        <Box flexDirection="column" marginY={1}>
          <TextField
            label="Sonnet model (balanced)"
            value={modelSonnet}
            onChange={setModelSonnet}
            onSubmit={() => setScreen('manage-models-haiku')}
            placeholder={selectedVariant.provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : 'deepseek,deepseek-chat'}
            hint="Default model for most tasks"
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'manage-models-haiku' && selectedVariant) {
    return (
      <Frame>
        <Header title="Configure Models (3/3)" subtitle={`Update model mapping for ${selectedVariant.name}`} />
        <Divider />
        <Box flexDirection="column" marginY={1}>
          <TextField
            label="Haiku model (fastest)"
            value={modelHaiku}
            onChange={setModelHaiku}
            onSubmit={() => setScreen('manage-models-saving')}
            placeholder={selectedVariant.provider === 'openrouter' ? 'anthropic/claude-3-haiku' : 'ollama,qwen2.5-coder:latest'}
            hint="Used for quick tasks and subagents. Press Enter to save."
          />
        </Box>
        <Divider />
        <HintBar />
      </Frame>
    );
  }

  if (screen === 'manage-models-saving' && selectedVariant) {
    return <ProgressScreen title="Saving model configuration" lines={progressLines} />;
  }

  if (screen === 'manage-models-done') {
    return (
      <CompletionScreen
        title="Models Updated"
        lines={doneLines}
        summary={completionSummary}
        nextSteps={completionNextSteps}
        help={completionHelp}
        shareStatus={shareStatus}
        onDone={value => {
          if (value === 'home') setScreen('home');
          else setScreen('manage-actions');
        }}
      />
    );
  }

  if (screen === 'manage-remove' && selectedVariant) {
    return (
      <Box flexDirection="column">
        <Header title="Remove variant" subtitle={`This will delete ${selectedVariant.name} from ${rootDir}`} />
        <Section title="Confirm">
          <SelectInput
            items={[
              { label: 'Remove', value: 'remove' },
              { label: 'Cancel', value: 'cancel' },
            ]}
            onSelect={item => {
              if (item.value === 'remove') {
                try {
                  core.removeVariant(rootDir, selectedVariant.name);
                  setCompletionSummary([`Removed ${selectedVariant.name}`]);
                  setCompletionNextSteps(['Use "Create" to make a new variant', 'Run "List" to see remaining variants']);
                  setCompletionHelp(['Help: cc-mirror help', 'List: cc-mirror list']);
                  setCompletionShareUrl(null);
                  setShareStatus(null);
                  setDoneLines([`Removed ${selectedVariant.name}`]);
                } catch (error) {
                  const message = error instanceof Error ? error.message : String(error);
                  setDoneLines([`Failed: ${message}`]);
                  setCompletionSummary([]);
                  setCompletionNextSteps([]);
                  setCompletionHelp([]);
                  setCompletionShareUrl(null);
                  setShareStatus(null);
                }
                setScreen('manage-remove-done');
              } else {
                setScreen('manage-actions');
              }
            }}
          />
        </Section>
      </Box>
    );
  }

  if (screen === 'manage-remove-done') {
    return (
      <CompletionScreen
        title="Remove variant"
        lines={doneLines}
        summary={completionSummary}
        nextSteps={completionNextSteps}
        help={completionHelp}
        shareStatus={shareStatus}
        onDone={value => {
          if (value === 'home') setScreen('home');
          else setScreen('exit');
        }}
      />
    );
  }

  if (screen === 'updateAll') {
    return <ProgressScreen title="Updating all variants" lines={progressLines} />;
  }

  if (screen === 'updateAll-done') {
    return (
      <CompletionScreen
        title="Update all"
        lines={doneLines}
        summary={completionSummary}
        nextSteps={completionNextSteps}
        help={completionHelp}
        shareStatus={shareStatus}
        onDone={value => {
          if (value === 'home') setScreen('home');
          else setScreen('exit');
        }}
      />
    );
  }

  if (screen === 'doctor') {
    return <DiagnosticsScreen report={doctorReport} onDone={() => setScreen('home')} />;
  }

  return (
    <Frame>
      <Header title="CC-MIRROR" subtitle="Unknown state" />
    </Frame>
  );
};
