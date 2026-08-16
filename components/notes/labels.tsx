import type { NoteVisibility } from "@/types/index";

export const noteVisibilityLabels: Record<NoteVisibility, string> = {
  private: "Private",
  team: "Team",
  client: "Client",
};

export const noteVisibilityHints: Record<NoteVisibility, string> = {
  private: "Only you can see this note.",
  team: "Visible to workspace staff.",
  client: "Visible to the linked client. Never use this for internal details.",
};
