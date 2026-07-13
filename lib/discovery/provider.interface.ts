import { IcpRawInput, IcpExpandedProfile } from "../../types/icp";
import { IcpExpansionResult } from "../services/ai.service";

export interface DiscoveredCompanyInput {
  name: string;
  website?: string;
  industry?: string;
  country?: string;
  description?: string;
  snippet?: string;
  employeeEstimate?: number;
  source: string;
  rawPayload: any;
}

export interface DiscoveryProvider {
  /**
   * Searches for companies matching the raw and expanded ICP.
   */
  search(
    rawInput: IcpRawInput,
    expandedProfile: IcpExpansionResult
  ): Promise<DiscoveredCompanyInput[]>;
}
