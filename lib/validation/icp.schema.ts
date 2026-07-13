import { z } from "zod";

export const icpRawInputSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  productDescription: z.string().min(10, "Product description must be at least 10 characters"),
  industry: z.string().min(1, "Industry is required"),
  country: z.string().min(1, "Country is required"),
  targetMarket: z.enum(["SMB", "Mid-Market", "Enterprise", "All"]),
  businessTypes: z.array(
    z.enum(["retailer", "distributor", "wholesaler", "reseller", "importer"])
  ).min(1, "Select at least one business type"),
  employeeRange: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  additionalNotes: z.string().optional(),
});

export const icpExpandedProfileSchema = z.object({
  targetCompanies: z.array(z.string()).min(1),
  exclude: z.array(z.string()).min(1),
  reasoning: z.string().min(1),
});

export const icpProfileDetailsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  rawInput: icpRawInputSchema,
  expandedProfile: icpExpandedProfileSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
