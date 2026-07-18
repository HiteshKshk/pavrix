export interface DiscoveredCompany {
  name: string;
  website?: string;
  title?: string;
  snippet?: string;
}

export interface DiscoveryProvider {
  /**
   * Searches for companies matching the provided keywords.
   */
  search(keywords: string[]): Promise<DiscoveredCompany[]>;
}

