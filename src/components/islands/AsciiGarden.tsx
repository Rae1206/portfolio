import { GardenScene } from '@/lib/ascii/garden';
import { gardenPresets, type GardenPreset } from '@/lib/ascii/presets';
import { AsciiCanvas } from './AsciiCanvas';

interface AsciiGardenProps {
  preset: GardenPreset;
  /** Overrides the preset seed to get a different arrangement. */
  seed?: number;
  fontSize?: number;
  /** Animation time scale; defaults to the renderer's calm default. */
  speed?: number;
  className?: string;
}

export default function AsciiGarden({ preset, seed, fontSize = 12, speed, className }: AsciiGardenProps) {
  return (
    <AsciiCanvas
      className={className}
      fontSize={fontSize}
      speed={speed}
      createScene={() => new GardenScene({ ...gardenPresets[preset], ...(seed !== undefined && { seed }) })}
    />
  );
}
