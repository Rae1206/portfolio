/**
 * Site-wide content. Placeholder values: replace with real data later.
 * Components read from here, so content changes never touch markup.
 */

export interface NavItem {
  id: string;
  label: string;
}

export interface Stat {
  icon: 'code' | 'github' | 'coffee';
  value: string;
  label: string;
}

export interface SocialLink {
  label: string;
  href: string;
  handle: string;
}

export const profile = {
  firstName: 'Alex',
  lastName: 'Alvarado',
  role: 'Software Engineer',
  roleAccent: 'Developer',
  handle: 'alex@portfolio',
  location: 'Guayaquil, EC',
  timeZone: 'America/Guayaquil',
  greeting: 'Hello, World!',
  tagline: [
    'I build digital experiences, craft innovative solutions,',
    'and turn ideas into reality.',
  ],
  motto: ['Code', 'Create', 'Innovate', 'Repeat'],
  terminalQuote: ['Dream big. Code better.', 'Keep pushing forward.'],
} as const;

export const navItems: NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
];

export const stats: Stat[] = [
  { icon: 'code', value: '5+', label: 'Projects' },
  { icon: 'github', value: '1.2k+', label: 'Commits' },
  { icon: 'coffee', value: '10k+', label: 'Hours Coding' },
];

export const socials: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/', handle: '@your-handle' },
  { label: 'LinkedIn', href: 'https://linkedin.com/', handle: 'in/your-handle' },
  { label: 'Email', href: 'mailto:hello@example.com', handle: 'hello@example.com' },
];
