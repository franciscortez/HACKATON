import type { ToolMeta } from "@/types/tool";

const tools: ToolMeta[] = [
  { slug: "meeting-to-action", index: "01", name: "Meeting to action", summary: "Transcript and team roster to an action register and follow-up email.", status: "NEXT" },
  { slug: "sources-to-newsletter", index: "02", name: "Sources to newsletter", summary: "Approved sources and audience to a cited newsletter draft.", status: "PLANNED" },
  { slug: "research-to-call-brief", index: "03", name: "Research to call brief", summary: "Company URL, contact and objective to a one-page call brief.", status: "PLANNED" },
  { slug: "url-to-social-content", index: "04", name: "URL to social content", summary: "A public page and brand to three posts and a caption.", status: "PLANNED" },
  { slug: "brief-to-landing-page", index: "05", name: "Brief to landing page", summary: "Offer brief, approved proof and brand to a responsive page draft.", status: "PLANNED" },
  { slug: "video-to-variations", index: "06", name: "Source video to variations", summary: "Owned video and hooks to three captioned short variations.", status: "PLANNED" },
  { slug: "enquiry-to-handover", index: "07", name: "Enquiry to qualified handover", summary: "Enquiry and fit rules to a qualification and reply draft.", status: "PLANNED" },
  { slug: "discovery-to-proposal", index: "08", name: "Discovery to proposal", summary: "Discovery notes and approved catalogue to a proposal draft.", status: "PLANNED" },
  { slug: "intake-to-onboarding", index: "09", name: "Client intake to onboarding", summary: "Intake and checklist to gaps, kickoff agenda and welcome email.", status: "PLANNED" },
  { slug: "recording-to-sop", index: "10", name: "Recording to SOP", summary: "Process recording or transcript to an editable step-by-step SOP.", status: "PLANNED" },
];

export function listTools(): ToolMeta[] {
  return tools;
}

export function getTool(slug: string): ToolMeta | null {
  return tools.find((t) => t.slug === slug) ?? null;
}
