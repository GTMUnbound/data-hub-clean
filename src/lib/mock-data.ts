import { ContactList, ContactRecord } from "@/types";

const names = ["Alice Johnson", "Bob Smith", "Carol White", "David Brown", "Emma Davis", "Frank Miller", "Grace Wilson", "Henry Moore", "Iris Taylor", "Jack Anderson", "Kate Thomas", "Leo Jackson", "Mia Harris", "Noah Martin", "Olivia Garcia", "Paul Martinez", "Quinn Robinson", "Rachel Clark", "Sam Rodriguez", "Tina Lewis"];
const companies = ["Acme Corp", "Globex Inc", "Initech", "Hooli", "Piedmont AI", "Stripe", "Notion Labs", "Linear App", "Vercel", "Supabase"];
const titles = ["CEO", "CTO", "VP Sales", "Head of Growth", "Marketing Manager", "SDR", "Account Executive", "Product Manager", "Engineer", "Designer"];
const cities = ["San Francisco", "New York", "London", "Berlin", "Tokyo", "Austin", "Toronto", "Paris", "Sydney", "Singapore"];
const countries = ["US", "US", "UK", "Germany", "Japan", "US", "Canada", "France", "Australia", "Singapore"];
const sources = ["LinkedIn", "Webinar", "Conference", "Referral", "Inbound", "Cold Outreach"];
const tagOptions = ["ICP", "Decision Maker", "Champion", "Technical", "Enterprise", "SMB", "Warm Lead", "Follow Up"];

function randomRecord(i: number): ContactRecord {
  const cityIdx = i % cities.length;
  return {
    id: `rec-${i}`,
    full_name: names[i % names.length],
    email: `${names[i % names.length].toLowerCase().replace(" ", ".")}@${companies[i % companies.length].toLowerCase().replace(/\s/g, "")}.com`,
    company: companies[i % companies.length],
    title: titles[i % titles.length],
    city: cities[cityIdx],
    country: countries[cityIdx],
    source: sources[i % sources.length],
    tags: [tagOptions[i % tagOptions.length], tagOptions[(i + 3) % tagOptions.length]].filter((v, idx, a) => a.indexOf(v) === idx),
    notes: "",
  };
}

export function createMockRecords(count: number): ContactRecord[] {
  return Array.from({ length: count }, (_, i) => randomRecord(i));
}

export const mockLists: ContactList[] = [
  { id: "list-1", name: "Series A Founders Q1", created_at: "2025-03-15T10:00:00Z", records: createMockRecords(48) },
  { id: "list-2", name: "Enterprise Prospects", created_at: "2025-03-28T14:30:00Z", records: createMockRecords(125) },
  { id: "list-3", name: "Webinar Attendees - March", created_at: "2025-04-01T09:00:00Z", records: createMockRecords(67) },
];
