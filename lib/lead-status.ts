export type LeadStatus =
  | "New"
  | "Qualified"
  | "Contacted"
  | "Meeting"
  | "Won"
  | "Lost"
  | "Archive";

export const LEAD_STATUS_VALUES: LeadStatus[] = [
  "New",
  "Qualified",
  "Contacted",
  "Meeting",
  "Won",
  "Lost",
  "Archive",
];
