export interface ContactRecord {
  id: string;
  full_name: string;
  email: string;
  company: string;
  title: string;
  city: string;
  country: string;
  source: string;
  tags: string[];
  notes: string;
  custom_fields?: Record<string, any>;
  is_duplicate?: boolean;
}

export interface ContactList {
  id: string;
  name: string;
  created_at: string;
  record_count?: number;
}

export type DuplicateRule = "email" | "name_company" | "none";
