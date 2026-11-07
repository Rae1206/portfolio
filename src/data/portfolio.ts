/**
 * Portfolio content (projects, skills, experience). Placeholder values.
 */

export interface Project {
  slug: string;
  title: string;
  summary: string;
  stack: string[];
  year: string;
  status: 'live' | 'wip' | 'archived';
  href?: string;
  repo?: string;
}

export interface SkillGroup {
  name: string;
  skills: { name: string; level: number }[];
}

export interface ExperienceEntry {
  hash: string;
  role: string;
  company: string;
  period: string;
  summary: string;
  highlights: string[];
}

export const about = {
  file: 'about.md',
  paragraphs: [
    'Placeholder bio. A short paragraph about who you are, what you enjoy building and the problems you like to solve.',
    'A second paragraph about your approach: clean architecture, tests that matter and interfaces that feel alive.',
  ],
  facts: [
    { key: 'based_in', value: 'Guayaquil, EC' },
    { key: 'focus', value: 'Web & software engineering' },
    { key: 'currently', value: 'Building something new' },
    { key: 'fuel', value: 'Coffee & curiosity' },
  ],
};

export const projects: Project[] = [
  {
    slug: 'project-one',
    title: 'Project One',
    summary: 'Placeholder description of a project, the problem it solves and its impact.',
    stack: ['Astro', 'React', 'TypeScript'],
    year: '2026',
    status: 'live',
    href: '#',
    repo: '#',
  },
  {
    slug: 'project-two',
    title: 'Project Two',
    summary: 'Placeholder description of a project, the problem it solves and its impact.',
    stack: ['Node.js', 'PostgreSQL', 'Docker'],
    year: '2025',
    status: 'wip',
    repo: '#',
  },
  {
    slug: 'project-three',
    title: 'Project Three',
    summary: 'Placeholder description of a project, the problem it solves and its impact.',
    stack: ['Three.js', 'WebGL', 'GLSL'],
    year: '2025',
    status: 'live',
    href: '#',
  },
  {
    slug: 'project-four',
    title: 'Project Four',
    summary: 'Placeholder description of a project, the problem it solves and its impact.',
    stack: ['Python', 'FastAPI', 'Redis'],
    year: '2024',
    status: 'archived',
    repo: '#',
  },
];

export const skillGroups: SkillGroup[] = [
  {
    name: 'frontend',
    skills: [
      { name: 'TypeScript', level: 0.9 },
      { name: 'React', level: 0.85 },
      { name: 'Astro', level: 0.8 },
      { name: 'Three.js', level: 0.6 },
    ],
  },
  {
    name: 'backend',
    skills: [
      { name: 'Node.js', level: 0.85 },
      { name: 'Python', level: 0.7 },
      { name: 'PostgreSQL', level: 0.75 },
    ],
  },
  {
    name: 'craft',
    skills: [
      { name: 'Clean Architecture', level: 0.8 },
      { name: 'Testing', level: 0.75 },
      { name: 'Docker', level: 0.65 },
    ],
  },
];

export const experience: ExperienceEntry[] = [
  {
    hash: 'a3f9c21',
    role: 'Software Engineer',
    company: 'Company Name',
    period: '2024 — present',
    summary: 'Placeholder summary of the role and its scope.',
    highlights: ['Placeholder achievement with measurable impact.', 'Another placeholder highlight.'],
  },
  {
    hash: '7be0d14',
    role: 'Frontend Developer',
    company: 'Company Name',
    period: '2022 — 2024',
    summary: 'Placeholder summary of the role and its scope.',
    highlights: ['Placeholder achievement with measurable impact.', 'Another placeholder highlight.'],
  },
  {
    hash: '1c5e8aa',
    role: 'Junior Developer',
    company: 'Company Name',
    period: '2021 — 2022',
    summary: 'Placeholder summary of the role and its scope.',
    highlights: ['Placeholder achievement with measurable impact.'],
  },
];
