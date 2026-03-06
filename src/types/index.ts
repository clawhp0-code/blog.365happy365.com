export interface PostMeta {
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  featured: boolean;
  draft: boolean;
  coverImage?: string;
  slug: string;
  url: string;
  readingTime: number;
}

export interface CategoryInfo {
  name: string;
  count: number;
  slug: string;
}

export interface TagInfo {
  name: string;
  count: number;
  slug: string;
}
