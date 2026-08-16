import { notFound, redirect } from "next/navigation";

import { getFileSignedUrlAction } from "@/lib/actions/files";
import { isUuid } from "@/lib/utils/ids";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const result = await getFileSignedUrlAction(id, true);

  if ("error" in result || !result.url) {
    notFound();
  }

  redirect(result.url);
}
