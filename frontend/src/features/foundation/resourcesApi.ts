import { httpClient } from "../../services/api/httpClient";

export interface ResourceSummary {
  id: number;
  name: string;
}

export interface ResourcePage {
  items: ResourceSummary[];
  total: number;
  offset: number;
  limit: number;
}

export async function listResources(offset: number, limit: number): Promise<ResourcePage> {
  const response = await httpClient.get<ResourcePage>("/resources", {
    params: { offset, limit },
  });
  return response.data;
}

export async function listAllResources(): Promise<ResourceSummary[]> {
  const resources: ResourceSummary[] = [];
  const limit = 100;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await listResources(offset, limit);
    resources.push(...page.items);
    total = page.total;
    if (page.items.length === 0) break;
    offset += page.items.length;
  }

  return resources;
}