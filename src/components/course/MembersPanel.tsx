"use client";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Card, EmptyState, Input, QueryState, Skeleton } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { useMoodle } from "@/lib/client-api";
import type { EnrolledUser } from "@/lib/moodle/types";
import { isStaffMember } from "./lib";
import { MessageLink } from "./MessageLink";

/** Shown above this many members, the list gets a filter box. */
const FILTER_FROM = 12;

/** Roles cost Moodle a query per member, so the full list loads only when this tab opens. */
const MEMBER_FIELDS = [{ name: "userfields", value: "id,fullname,profileimageurl,roles" }];

function useRoleLabel() {
  const t = useT();
  return (member: EnrolledUser) => {
    const role = member.roles?.[0];
    if (!role) return "";
    if (role.name) return role.name;
    const key = `moodleRole.${role.shortname}`;
    const label = t(key);
    return label === key ? role.shortname : label;
  };
}

function MemberGroup({ title, members, selfId }: { title: string; members: EnrolledUser[]; selfId: number }) {
  const roleLabel = useRoleLabel();
  if (!members.length) return null;
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">
        {title} · {members.length}
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-surface-2/60 px-3 py-2.5">
            <UserAvatar name={m.fullname} id={m.id} src={m.profileimageurl} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-fg" title={m.fullname}>
                {m.fullname}
              </p>
              <p className="truncate text-xs text-subtle">{roleLabel(m)}</p>
            </div>
            {m.id !== selfId && <MessageLink userId={m.id} name={m.fullname} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MemberList({ members, selfId }: { members: EnrolledUser[]; selfId: number }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase();
  const shown = members
    .filter((m) => !q || m.fullname.toLocaleLowerCase().includes(q))
    .sort((a, b) => a.fullname.localeCompare(b.fullname));
  const staff = shown.filter(isStaffMember);
  const others = shown.filter((m) => !isStaffMember(m));

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-extrabold text-fg">{t("course.membersCount", { n: members.length })}</h2>
        {members.length > FILTER_FROM && (
          <Input
            type="search"
            icon={Search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("course.members.search")}
            aria-label={t("course.members.search")}
            wrapperClassName="sm:w-64"
          />
        )}
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={Users} title={t(q ? "course.members.none" : "course.members.empty")} compact />
      ) : (
        <>
          <MemberGroup title={t("course.members.teachers")} members={staff} selfId={selfId} />
          <MemberGroup title={t("course.members.students")} members={others} selfId={selfId} />
        </>
      )}
    </Card>
  );
}

/** Members tab: teachers and classmates the user may see (core_enrol_get_enrolled_users). */
export function MembersPanel({ courseid, selfId }: { courseid: number; selfId: number }) {
  const t = useT();
  const { data, loading, error } = useMoodle<EnrolledUser[]>(
    "core_enrol_get_enrolled_users",
    { courseid, options: MEMBER_FIELDS },
    false,
    { cacheMs: 5 * 60_000 }
  );
  if (error) {
    return (
      <Card>
        <EmptyState icon={Users} title={t("common.errorTitle")} />
      </Card>
    );
  }
  return (
    <QueryState loading={loading} error={null} skeleton={<Skeleton className="h-64 w-full rounded-card" />}>
      <MemberList members={data ?? []} selfId={selfId} />
    </QueryState>
  );
}
