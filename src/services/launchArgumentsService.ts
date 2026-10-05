import type { Game } from '../types/game';

export interface LaunchPreset {
  id: string;
  label: string;
  arg: string;
  description: string;
  category: 'performance' | 'display' | 'graphics' | 'quality_of_life';
}

export interface DetectedEngineInfo {
  engineName: string;
  confidence: 'high' | 'medium';
  recommendedPresets: LaunchPreset[];
}

// Universal presets available for any PC game
export const UNIVERSAL_PRESETS: LaunchPreset[] = [
  {
    id: 'fullscreen',
    label: 'Exclusive Fullscreen',
    arg: '-fullscreen',
    description: 'Forces true fullscreen mode for lower latency',
    category: 'display'
  },
  {
    id: 'windowed',
    label: 'Windowed Mode',
    arg: '-windowed',
    description: 'Launches in windowed mode',
    category: 'display'
  },
  {
    id: 'borderless',
    label: 'Borderless Windowed',
    arg: '-borderless',
    description: 'Borderless window for easy alt-tabbing',
    category: 'display'
  },
  {
    id: 'dx11',
    label: 'DirectX 11 Backend',
    arg: '-dx11',
    description: 'Forces DirectX 11 for stability on older GPUs',
    category: 'graphics'
  },
  {
    id: 'dx12',
    label: 'DirectX 12 Backend',
    arg: '-dx12',
    description: 'Forces DirectX 12 for modern GPUs and raytracing',
    category: 'graphics'
  },
  {
    id: 'vulkan',
    label: 'Vulkan Renderer',
    arg: '-vulkan',
    description: 'Forces Vulkan API rendering pipeline',
    category: 'graphics'
  }
];

export class LaunchArgumentsService {
  /**
   * Analyzes a game title, executable path, and metadata to identify
   * the game engine (Unity, Unreal, Source, Godot) or specific game title,
   * returning targeted launch arguments.
   */
  public static detectSmartPresets(game: Partial<Game>): DetectedEngineInfo {
    const title = (game.title || '').toLowerCase();
    const exe = (game.executablePath || '').toLowerCase();
    const workingDir = (game.workingDirectory || '').toLowerCase();

    const presets: LaunchPreset[] = [];
    let detectedEngine = 'Standard PC';

    // 1. SPECIFIC GAME RECOGNITION
    if (title.includes('cyberpunk') || exe.includes('cyberpunk')) {
      return {
        engineName: 'REDengine (Cyberpunk 2077)',
        confidence: 'high',
        recommendedPresets: [
          {
            id: 'cp-skip',
            label: 'Skip REDlauncher',
            arg: '--launcher-skip',
            description: 'Directly starts Cyberpunk 2077 without opening launcher',
            category: 'quality_of_life'
          },
          {
            id: 'cp-intro',
            label: 'Skip Intro Videos',
            arg: '-skipStartScreen',
            description: 'Bypasses introductory logo sequences',
            category: 'quality_of_life'
          }
        ]
      };
    }

    if (title.includes('witcher') || exe.includes('witcher')) {
      return {
        engineName: 'REDengine (The Witcher 3)',
        confidence: 'high',
        recommendedPresets: [
          {
            id: 'w3-skip',
            label: 'Skip Launcher',
            arg: '-skipLauncher',
            description: 'Launches directly into Witcher 3 without launcher delay',
            category: 'quality_of_life'
          },
          {
            id: 'w3-dx11',
            label: 'DirectX 11 Mode',
            arg: '-dx11',
            description: 'Run Witcher 3 in DX11 mode for smoother framerate on older GPUs',
            category: 'graphics'
          }
        ]
      };
    }

    if (title.includes('baldur') || exe.includes('bg3')) {
      return {
        engineName: 'Divinity Engine (Baldur\'s Gate 3)',
        confidence: 'high',
        recommendedPresets: [
          {
            id: 'bg3-skip',
            label: 'Skip Larian Launcher',
            arg: '--skip-launcher',
            description: 'Bypasses Larian launcher directly into game',
            category: 'quality_of_life'
          },
          {
            id: 'bg3-dx11',
            label: 'DirectX 11 API',
            arg: '-dx11',
            description: 'Preferred API for Nvidia GPUs',
            category: 'graphics'
          },
          {
            id: 'bg3-vulkan',
            label: 'Vulkan API',
            arg: '-vulkan',
            description: 'Preferred API for AMD GPUs / Steam Deck',
            category: 'graphics'
          }
        ]
      };
    }

    if (title.includes('minecraft') || exe.includes('javaw')) {
      return {
        engineName: 'Java Virtual Machine (Minecraft)',
        confidence: 'high',
        recommendedPresets: [
          {
            id: 'mc-ram-4g',
            label: 'Allocate 4GB RAM',
            arg: '-Xmx4G -Xms2G',
            description: 'Sets max RAM allocation to 4GB (smooth gameplay with mods)',
            category: 'performance'
          },
          {
            id: 'mc-ram-8g',
            label: 'Allocate 8GB RAM',
            arg: '-Xmx8G -Xms4G',
            description: 'Sets max RAM allocation to 8GB (heavy shaders and modpacks)',
            category: 'performance'
          }
        ]
      };
    }

    // 2. UNREAL ENGINE (UE4 / UE5) DETECTION
    const isUnreal =
      exe.includes('shipping.exe') ||
      exe.includes('win64-shipping') ||
      workingDir.includes('binaries\\win64') ||
      workingDir.includes('binaries/win64') ||
      title.includes('unreal');

    if (isUnreal) {
      detectedEngine = 'Unreal Engine';
      presets.push(
        {
          id: 'ue-cores',
          label: 'Use All CPU Cores',
          arg: '-USEALLAVAILABLECORES',
          description: 'Instructs Unreal Engine to utilize all physical and logical CPU cores',
          category: 'performance'
        },
        {
          id: 'ue-nosplash',
          label: 'Skip Splash Screen',
          arg: '-nosplash',
          description: 'Skips the initial Unreal splash banner on boot',
          category: 'quality_of_life'
        },
        {
          id: 'ue-dx11',
          label: 'Force DX11',
          arg: '-dx11',
          description: 'Overrides default DX12 pipeline for stability',
          category: 'graphics'
        },
        {
          id: 'ue-dx12',
          label: 'Force DX12',
          arg: '-dx12',
          description: 'Enables DirectX 12 rendering',
          category: 'graphics'
        },
        {
          id: 'ue-popin',
          label: 'Disable Texture Pop-in',
          arg: '-NOTEXTURESTREAMING',
          description: 'Loads highest resolution textures directly into VRAM',
          category: 'graphics'
        }
      );
      return {
        engineName: detectedEngine,
        confidence: 'high',
        recommendedPresets: presets
      };
    }

    // 3. UNITY ENGINE DETECTION
    const isUnity =
      exe.includes('unity') ||
      workingDir.includes('_data') ||
      title.includes('unity');

    if (isUnity) {
      detectedEngine = 'Unity Engine';
      presets.push(
        {
          id: 'unity-excl',
          label: 'True Exclusive Fullscreen',
          arg: '-window-mode exclusive',
          description: 'Bypasses Windows Desktop Window Manager for minimal input lag',
          category: 'display'
        },
        {
          id: 'unity-borderless',
          label: 'Borderless Popup Window',
          arg: '-popupwindow',
          description: 'Borderless windowed mode for smooth multitasking',
          category: 'display'
        },
        {
          id: 'unity-dx11',
          label: 'Force Direct3D 11',
          arg: '-force-d3d11',
          description: 'Forces standard DirectX 11 renderer',
          category: 'graphics'
        },
        {
          id: 'unity-vulkan',
          label: 'Force Vulkan',
          arg: '-force-vulkan',
          description: 'Runs Unity via Vulkan graphics API',
          category: 'graphics'
        },
        {
          id: 'unity-single',
          label: 'Single Instance Lock',
          arg: '-single-instance',
          description: 'Prevents accidentally opening multiple copies of the game',
          category: 'quality_of_life'
        }
      );
      return {
        engineName: detectedEngine,
        confidence: 'high',
        recommendedPresets: presets
      };
    }

    // 4. SOURCE ENGINE (VALVE / CS / TF2 / L4D)
    const isSource =
      exe.includes('hl2.exe') ||
      exe.includes('csgo.exe') ||
      exe.includes('left4dead') ||
      exe.includes('portal') ||
      title.includes('counter-strike') ||
      title.includes('half-life');

    if (isSource) {
      detectedEngine = 'Source Engine';
      presets.push(
        {
          id: 'src-novid',
          label: 'Skip Valve Intro',
          arg: '-novid',
          description: 'Skips the Valve guy intro movie',
          category: 'quality_of_life'
        },
        {
          id: 'src-nojoy',
          label: 'Disable Joystick Polling',
          arg: '-nojoy',
          description: 'Frees up CPU resources by disabling joystick listener',
          category: 'performance'
        },
        {
          id: 'src-high',
          label: 'High Process Priority',
          arg: '-high',
          description: 'Gives the game process high CPU scheduling priority',
          category: 'performance'
        },
        {
          id: 'src-threads',
          label: 'Multi-threaded Rendering',
          arg: '-threads 4',
          description: 'Directs engine to utilize multi-threaded queues',
          category: 'performance'
        }
      );
      return {
        engineName: detectedEngine,
        confidence: 'high',
        recommendedPresets: presets
      };
    }

    // Default Universal Fallback
    return {
      engineName: 'Universal PC',
      confidence: 'medium',
      recommendedPresets: UNIVERSAL_PRESETS
    };
  }

  /**
   * Appends or toggles a preset argument into the current argument string cleanly
   */
  public static appendArgument(currentArgs: string = '', argToAdd: string): string {
    const currentTokens = currentArgs.trim().split(/\s+/).filter(Boolean);
    const newTokens = argToAdd.trim().split(/\s+/).filter(Boolean);

    for (const token of newTokens) {
      if (!currentTokens.includes(token)) {
        currentTokens.push(token);
      }
    }

    return currentTokens.join(' ');
  }

  /**
   * Removes a preset argument from current argument string
   */
  public static removeArgument(currentArgs: string = '', argToRemove: string): string {
    const currentTokens = currentArgs.trim().split(/\s+/).filter(Boolean);
    const toRemoveTokens = argToRemove.trim().split(/\s+/).filter(Boolean);

    const filtered = currentTokens.filter((token) => !toRemoveTokens.includes(token));
    return filtered.join(' ');
  }
}
