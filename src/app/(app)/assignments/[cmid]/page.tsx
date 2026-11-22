"use client";
import { use } from "react";
import { AssignmentView } from "@/components/assignment/AssignmentView";

export default function AssignmentPage({ params }: PageProps<"/assignments/[cmid]">) {
  const { cmid } = use(params);
  const id = Number(cmid);
  // Anything but a positive integer goes straight to the not-found state.
  return <AssignmentView cmid={Number.isInteger(id) && id > 0 ? id : 0} />;
}
