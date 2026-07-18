export interface IcpRawInput {
  companyName: string;
  productDescription: string;
  industry: string;
  country: string;
  targetMarket: "SMB" | "Mid-Market" | "Enterprise" | "All";
  businessTypes: Array<"retailer" | "distributor" | "wholesaler" | "reseller" | "importer">;
  employeeRange: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  keywords: string[];
  additionalNotes?: string;
}

export interface IcpExpandedProfile {
  targetCompanies: string[];
  exclude: string[];
  reasoning: string;
  expandedBuyerProfile?: string;
  searchKeywords?: string[];
  industryKeywords?: string[];
  alternativePhrases?: string[];
}

export interface IcpProfileDetails {
  id: string;
  userId: string;
  name: string;
  rawInput: IcpRawInput;
  expandedProfile: IcpExpandedProfile;
  createdAt: string;
  updatedAt: string;
}
