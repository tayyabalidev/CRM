import { Badge } from "@/components/ui/badge";
import { noteVisibilityLabels } from "@/components/notes/labels";
import type { NoteVisibility } from "@/types/index";

export function NoteVisibilityBadge({ value }: { value: NoteVisibility }) {
  return (
    <Badge variant="outline" className="capitalize">
      {noteVisibilityLabels[value]}
    </Badge>
  );
}
