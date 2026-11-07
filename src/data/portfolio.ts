/**
 * Portfolio content (about, projects, skills, experience).
 * Sources: Alex's CV (Jan 2026), his public GitHub (github.com/Rae1206) and
 * his local project folders. Work projects carry no code links.
 */

export interface Project {
  slug: string;
  title: string;
  /** Where it was built: employer, client or personal. */
  context: string;
  summary: string;
  stack: string[];
  year: string;
  status: 'live' | 'wip' | 'archived';
  href?: string;
  repo?: string;
}

export interface SkillGroup {
  name: string;
  /** No levels on purpose: listed skills are skills he has. */
  skills: string[];
}

export interface ExperienceEntry {
  hash: string;
  role: string;
  company: string;
  period: string;
  summary: string;
  highlights: string[];
}

const GITHUB = 'https://github.com/Rae1206';

export const about = {
  file: 'about.md',
  paragraphs: [
    "I'm a full-stack software engineer from Guayaquil, Ecuador. I work at Viamatica building enterprise software with .NET, Angular and SQL, including systems for the Bolsa de Valores de Guayaquil, the city's stock exchange.",
    'Before writing code for a living I spent five years running inventory, production and logistics, so I build software for real operations: clear data, reliable flows and tools people actually use. On my own I built and run megaregalitos.com, a production e-commerce site, from database to deployment.',
    'I studied Software Engineering at Universidad de Guayaquil, where my thesis trained reinforcement-learning agents to optimize the energy use of buildings in simulation.',
  ],
  facts: [
    { key: 'based_in', value: 'Guayaquil, EC' },
    { key: 'role', value: 'Software Developer @ Viamatica' },
    { key: 'stack', value: '.NET · Angular · SQL' },
    { key: 'studied', value: 'Software Engineering, Universidad de Guayaquil' },
    { key: 'speaks', value: 'Spanish · English' },
  ],
};

export const projects: Project[] = [
  {
    slug: 'bvg',
    title: 'BVG — Bolsa de Valores de Guayaquil',
    context: 'Viamatica · client work',
    summary:
      'Stock-exchange software for the Guayaquil Stock Exchange. I work across its legacy and modern layers: Java and Visual FoxPro services, C# back ends and Angular front ends, on top of SQL and MongoDB data.',
    stack: ['Java', 'Visual FoxPro', 'C#', 'Angular', 'SQL Server', 'MongoDB'],
    year: '2026',
    status: 'live',
  },
  {
    slug: 'megaregalitos',
    title: 'Megaregalitos e-commerce',
    context: 'Freelance · sole author',
    summary:
      'Production store for a Guayaquil florist and gift shop, built end to end: catalog, search, cart with WhatsApp checkout, and an admin panel with orders, drag-and-drop ordering, analytics and PDF generation. 17 SQL migrations and 38 automated tests.',
    stack: ['Next.js 14', 'React', 'TypeScript', 'Supabase', 'Cloudflare R2', 'Vercel'],
    year: '2026',
    status: 'live',
    href: 'https://www.megaregalitos.com/',
  },
  {
    slug: 'twitter',
    title: 'Twitter-style social network',
    context: 'Personal · capstone project',
    summary:
      'Full-stack social network: posts and media, likes, retweets, follows, real-time direct messages over SignalR, an AI assistant that drafts posts, and an admin panel for reports, suspensions and audit logs.',
    stack: ['.NET 10', 'Angular 21', 'SignalR', 'SQL Server', 'MongoDB logs', 'Docker'],
    year: '2026',
    status: 'archived',
    repo: `${GITHUB}/Twitter`,
  },
  {
    slug: 'inventario',
    title: 'InventarioMini',
    context: 'Personal',
    summary:
      'Inventory and invoicing system with products, warehouses, customers and stock views, plus a financial-statements module that imports Excel and exports Excel and PDF reports.',
    stack: ['.NET 10', 'Angular 21', 'EF Core', 'SQL Server', 'QuestPDF', 'ClosedXML'],
    year: '2026',
    status: 'wip',
    repo: `${GITHUB}/MiniInventario`,
  },
  {
    slug: 'focus',
    title: 'Focus',
    context: 'Personal · mobile',
    summary:
      'Android-first personal finance app: accounts, transactions, schedules, categories and budgets, stored offline in SQLite with versioned backup and restore.',
    stack: ['React Native', 'Expo', 'TypeScript', 'SQLite', 'Jest'],
    year: '2026',
    status: 'wip',
  },
  {
    slug: 'taskless',
    title: 'Taskless',
    context: 'Personal',
    summary:
      'Kanban project and task manager with drag-and-drop boards. Auth keeps a short-lived access token in memory and a refresh token in an HttpOnly cookie, with rate limiting and input validation.',
    stack: ['React', 'Vite', 'Express', 'MySQL', 'Tailwind CSS'],
    year: '2026',
    status: 'archived',
    repo: `${GITHUB}/Johnny`,
  },
  {
    slug: 'continua',
    title: 'Continua',
    context: 'Personal · mobile',
    summary:
      'Flutter app that floats motivational quotes over your screen through the day, using background work, an Android overlay and push notifications.',
    stack: ['Flutter', 'Dart', 'Riverpod', 'Supabase', 'Firebase'],
    year: '2026',
    status: 'archived',
    repo: `${GITHUB}/Continua`,
  },
  {
    slug: 'cinevia',
    title: 'CineVia',
    context: 'Personal',
    summary: 'Cinema back office to manage movies and screening rooms, with login, route guards and server-side rendering.',
    stack: ['Angular', 'Angular SSR', 'TypeScript'],
    year: '2025',
    status: 'archived',
    repo: `${GITHUB}/CineVia`,
  },
];

export const skillGroups: SkillGroup[] = [
  {
    name: 'languages',
    skills: ['C#', 'TypeScript', 'JavaScript', 'Java', 'SQL', 'Visual FoxPro', 'Dart', 'Python'],
  },
  {
    name: 'backend',
    skills: ['.NET / ASP.NET Core', 'Entity Framework Core', 'SignalR', 'Node.js / Express', 'REST APIs', 'Clean Architecture'],
  },
  {
    name: 'frontend',
    skills: ['Angular', 'React', 'Next.js', 'Astro', 'Tailwind CSS', 'HTML & CSS'],
  },
  {
    name: 'data',
    skills: ['SQL Server', 'MongoDB', 'MySQL', 'Oracle', 'PostgreSQL / Supabase', 'SQLite'],
  },
  {
    name: 'mobile',
    skills: ['Flutter', 'React Native / Expo'],
  },
  {
    name: 'tools',
    skills: ['Git', 'Docker', 'Postman', 'Vercel', 'Cloudflare R2', 'AWS'],
  },
];

export const experience: ExperienceEntry[] = [
  {
    hash: 'v1a7c26',
    role: 'Software Developer · .NET / SQL / Angular',
    company: 'Viamatica',
    period: 'Feb 2026 — present',
    summary: 'Enterprise software for financial-sector clients, from database to user interface.',
    highlights: [
      'Develop for the Bolsa de Valores de Guayaquil across Java, Visual FoxPro, C# and Angular.',
      'Write and optimize SQL Server queries and work with MongoDB data for transactional processes.',
      'Build modules and fixes that improve internal processes, stability and performance.',
    ],
  },
  {
    hash: 'm3g4r20',
    role: 'Operations Assistant',
    company: 'Megaregalitos',
    period: '2020 — 2025',
    summary: 'Inventory, production and order fulfilment for a gift and flower business.',
    highlights: [
      'Managed inventory and supplies to keep materials available.',
      'Coordinated preparation, personalization and assembly of custom orders.',
      'Tracked orders with digital tools and organized dispatch to meet deadlines.',
    ],
  },
  {
    hash: 'e9d2019',
    role: 'Logistics & Event Production Assistant',
    company: 'Eventos Detalles EC',
    period: '2019 — 2020',
    summary: 'Event logistics, setup and warehouse control.',
    highlights: [
      'Handled loading, transport and return of materials, props and furniture.',
      'Set up and dismantled venues, supporting decoration and space layout.',
    ],
  },
];
