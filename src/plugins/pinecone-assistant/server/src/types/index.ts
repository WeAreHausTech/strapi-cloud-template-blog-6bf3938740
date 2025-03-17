export interface Article {
  id: string | number;
  title: string;
  description?: string;
  content?: string;
  locale?: string;
  categories?: Array<{
    id: string | number;
    name: string;
  }>;
  author?: {
    id: string | number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  status?: 'draft' | 'published';
  slug?: string;
  cover?: any;
  blocks?: any;
  documentId?: string;
}

export interface PineconeFile {
  id: string;
  metadata: {
    id: string;
    title: string;
    categories: string[];
    categoryIds: string[];
    author: string;
    authorId: string;
    locale: string;
    type: string;
    createdAt: string;
    updatedAt: string;
    status: string;
  };
} 