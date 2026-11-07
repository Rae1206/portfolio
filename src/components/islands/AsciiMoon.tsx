import { AsciiCanvas } from './AsciiCanvas';

interface AsciiMoonProps {
  fontSize?: number;
  className?: string;
}

/** Lazily loads Three.js only when the moon is mounted. */
const loadMoon = async () => {
  const { MoonScene } = await import('@/lib/ascii/moon');
  return new MoonScene();
};

export default function AsciiMoon({ fontSize = 8, className }: AsciiMoonProps) {
  return <AsciiCanvas className={className} fontSize={fontSize} lineHeight={1.15} createScene={loadMoon} />;
}
