"use client";

import { AddMemberPanel } from "@/components/family/AddMemberPanel";
import { useFamily } from "@/components/family/FamilyChrome";
import { useHour12, useLargerText, useTimezone } from "@/components/settings/SettingsProvider";
import { memberCircleInfo, photoPosts } from "@/lib/circle";
import type { Member, Post } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

function Avatar({ member, size = 56 }: { member: Member; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: member.color,
        fontSize: size > 48 ? "1.125rem" : "0.75rem",
      }}
      aria-hidden
    >
      {member.initials}
    </span>
  );
}

export function CircleView({
  members,
  posts,
  inviteCode,
  familyName,
  familyId,
  nowIso,
}: {
  members: Member[];
  posts: Post[];
  inviteCode?: string;
  familyName: string;
  familyId: string;
  nowIso: string;
}) {
  const { me } = useFamily();
  const easy = useLargerText();
  const timeZone = useTimezone();
  const hour12 = useHour12();
  const [showAddMember, setShowAddMember] = useState(false);
  const [copied, setCopied] = useState(false);
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const circle = useMemo(
    () => memberCircleInfo(members, posts, now, timeZone, hour12),
    [members, posts, now, timeZone, hour12],
  );
  const quiet = circle.filter((c) => c.quiet && c.member.id !== me.id);
  const photos = useMemo(() => photoPosts(posts), [posts]);
  const nameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);

  async function copyInvite() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="border-b border-rule pb-4">
        <h1 className={`font-bold ${easy ? "text-2xl" : "text-xl"}`}>Circle</h1>
        <p className="mt-1 text-sm leading-6 text-mute">
          {familyName} — who&apos;s here, when you last heard from them, and photos from chat.
        </p>
      </header>

      <section className="mt-5 flex flex-wrap items-center gap-3 border border-rule bg-paper p-4">
        {inviteCode ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-mute">Invite code</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-ink">{inviteCode}</p>
            <button
              type="button"
              onClick={copyInvite}
              className="mt-1 min-h-11 text-sm font-medium text-accent hover:underline"
            >
              {copied ? "Copied." : "Copy code"}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setShowAddMember(true)}
          className={`shrink-0 rounded-sm bg-ember font-semibold text-white hover:bg-ember-dark ${
            easy ? "min-h-12 px-5 text-base" : "min-h-11 px-4 text-sm"
          }`}
        >
          Add family member
        </button>
      </section>

      {quiet.length ? (
        <section className="mt-6" aria-labelledby="quiet-porch-heading">
          <h2 id="quiet-porch-heading" className={`font-semibold text-ink ${easy ? "text-lg" : "text-base"}`}>
            Quiet porch
          </h2>
          <p className="mt-1 text-sm text-mute">
            Not a diagnosis — just a note that someone hasn&apos;t posted in a while.
          </p>
          <ul className="mt-3 space-y-2">
            {quiet.map(({ member, lastHeard }) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 border border-rule bg-surface px-3 py-3 sm:px-4"
              >
                <Avatar member={member} size={easy ? 52 : 44} />
                <div className="min-w-0 flex-1">
                  <p className={`font-medium text-ink ${easy ? "text-base" : "text-sm"}`}>{member.name}</p>
                  <p className="text-sm text-mute">Last heard {lastHeard}</p>
                </div>
                <Link
                  href={`/family?with=${member.id}`}
                  className={`shrink-0 rounded-sm border border-ember bg-ember/5 font-medium text-ember hover:bg-ember/10 ${
                    easy ? "min-h-12 px-4 text-base" : "min-h-11 px-3 text-sm"
                  }`}
                >
                  Send a note
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="circle-people-heading">
        <h2 id="circle-people-heading" className={`font-semibold text-ink ${easy ? "text-lg" : "text-base"}`}>
          Everyone
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {circle.map(({ member, lastHeard, quiet: isQuiet }) => (
            <li key={member.id}>
              <Link
                href={member.id === me.id ? "/family" : `/family?with=${member.id}`}
                className={`flex h-full items-start gap-3 border border-rule bg-paper p-4 transition-colors hover:border-ember/40 hover:bg-surface ${
                  isQuiet ? "border-dashed" : ""
                }`}
              >
                <Avatar member={member} size={easy ? 60 : 52} />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-ink ${easy ? "text-lg" : "text-base"}`}>
                    {member.name}
                    {member.id === me.id ? (
                      <span className="ml-1.5 text-sm font-normal text-mute">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-mute">{member.role}</p>
                  {member.location ? (
                    <p className="mt-0.5 text-xs text-mute">{member.location}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-ink/80">
                    Last heard <span className="text-mute">{lastHeard}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {photos.length ? (
        <section className="mt-8 border-t border-rule pt-6" aria-labelledby="photo-shelf-heading">
          <h2 id="photo-shelf-heading" className={`font-semibold text-ink ${easy ? "text-lg" : "text-base"}`}>
            Photo shelf
          </h2>
          <p className="mt-1 text-sm text-mute">Shared moments from your chats.</p>
          <div className="mt-3 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
            {photos.map((post) => {
              const author = nameById[post.authorId] ?? "Someone";
              return (
                <figure
                  key={post.id}
                  className="w-44 shrink-0 snap-start border border-rule bg-paper sm:w-52"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-ground">
                    <Image
                      src={post.photoUrl!}
                      alt={post.photoAlt ?? post.body}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 176px, 208px"
                    />
                  </div>
                  <figcaption className="p-2">
                    <p className="text-xs font-medium text-ink">{author}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-mute">{post.body}</p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ) : null}

      {showAddMember ? (
        <AddMemberPanel
          familyId={familyId}
          inviteCode={inviteCode}
          familyName={familyName}
          onClose={() => setShowAddMember(false)}
          onChanged={() => setShowAddMember(false)}
        />
      ) : null}
    </div>
  );
}
