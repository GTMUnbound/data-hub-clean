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
}

export interface ContactList {
  id: string;
  name: string;
  created_at: string;
  records: ContactRecord[];
}

export type DuplicateRule = "email" | "name_company" | "none";
