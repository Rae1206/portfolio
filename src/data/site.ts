/**
 * Site-wide content. Components read from here, so content changes never
 * touch markup. Sources: Alex's CV and his public GitHub profile.
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
  roleAccent: 'Full-Stack Developer',
  handle: 'alex@portfolio',
  location: 'Guayaquil, EC',
  timeZone: 'America/Guayaquil',
  greeting: 'Hello, World!',
  tagline: [
    'Full-stack developer crafting reliable software with .NET, Angular and SQL,',
    'from stock-exchange systems to e-commerce that sells every day.',
  ],
  motto: ['Code', 'Create', 'Innovate', 'Repeat'],
  terminalQuote: ['Dream big. Code better.', 'Keep pushing forward.'],
} as const;

export const navItems: NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'experience', label: 'Experience' },
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
];

export const stats: Stat[] = [
  { icon: 'code', value: '8', label: 'Featured projects' },
  { icon: 'github', value: '17', label: 'Public repos' },
  { icon: 'coffee', value: '2020', label: 'Coding since' },
];

export const socials: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/Rae1206', handle: '@Rae1206' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/alex-alvarado-716bb8322/', handle: 'in/alex-alvarado' },
  { label: 'Email', href: 'mailto:alex.alvarado.rae@gmail.com', handle: 'alex.alvarado.rae@gmail.com' },
];
