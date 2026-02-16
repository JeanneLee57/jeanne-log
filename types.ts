export interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  content: string; // Markdown content
  author: string;
  date: string;
  tags: string[];
  readTime: string;
  coverImage?: string;
}

export enum PageView {
  HOME,
  POST_DETAIL,
}

export interface AboutLink {
  label: string;
  url: string;
  type: string;
}

export interface ExperienceDetail {
  title: string;
  items: string[];
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  description?: string;
  techStack?: string[];
  details?: ExperienceDetail[];
}

export interface SkillCategory {
  category: string;
  items: string;
}

export interface Education {
  school: string;
  major: string;
  period: string;
}

export interface Activity {
  title: string;
  period: string;
  description: string;
}

export interface AboutData {
  title: string;
  summary: string;
  author: string;
  date: string;
  tags: string[];
  profileImage: string;
  introduction: string;
  links: AboutLink[];
  experience: Experience[];
  skills: SkillCategory[];
  education: Education[];
  activities: Activity[];
}