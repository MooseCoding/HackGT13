"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function Composer() {
  const { me, easy } = useFamily();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"text" | "voice" | "photo" | "status">("text");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [listening, setListening] = useState(false);
  const recRef = useRef<BrowserRec | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  function startVoice() {
    const w = window as Window & {
      SpeechRecognition?: new () => BrowserRec;
      webkitSpeechRecognition?: new () => BrowserRec;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setBody((b) => b || "Voice isn't available in this browser — type instead.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (ev) => {
      const t = Array.from(ev.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setBody(t);
      setKind("voice");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function onPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      setKind("photo");
    };
    reader.readAsDataURL(file);
  }

  async function send() {
    const text = (textRef.current?.value ?? body).trim();
    if (!text && !photoUrl) return;
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: me.familyId,
        authorId: me.id,
        kind,
        body: text || (kind === "photo" ? "Photo" : "Voice note"),
        photoUrl,
        transcript: kind === "voice" ? text : undefined,
        voiceSeconds: kind === "voice" ? Math.max(4, Math.round(text.split(" ").length / 2)) : undefined,
      }),
    });
    setBody("");
    setPhotoUrl(undefined);
    setKind("text");
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-line bg-paper p-4 shadow-sm">
      <p className={`text-mute ${easy ? "text-base" : "text-sm"}`}>
        Posting as <span className="font-semibold text-ink">{me.name}</span>
      </p>
      <textarea
        ref={textRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={easy ? "Tap Talk, or type a short note…" : "A note, a memory, a photo caption…"}
        className={`mt-3 w-full resize-none rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-ember ${
          easy ? "min-h-32 text-xl" : "min-h-24"
        }`}
      />
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Upload preview" className="mt-3 max-h-40 rounded-2xl object-cover" />
      ) : null}
      <div className={`mt-3 flex flex-wrap gap-2 ${easy ? "gap-3" : ""}`}>
        <button
          type="button"
          onClick={startVoice}
          className={`rounded-full bg-ember px-5 font-semibold text-paper ${easy ? "h-14 text-lg" : "h-11"}`}
        >
          {listening ? "Listening…" : "Talk"}
        </button>
        <label
          className={`grid cursor-pointer place-items-center rounded-full border border-line px-5 font-semibold ${
            easy ? "h-14 text-lg" : "h-11"
          }`}
        >
          Photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
          />
        </label>
        <button
          type="button"
          onClick={() => setKind("status")}
          className={`rounded-full border border-line px-5 font-semibold ${easy ? "h-14 text-lg" : "h-11"}`}
        >
          Status
        </button>
        <button
          type="button"
          onClick={send}
          className={`ml-auto rounded-full bg-ink px-6 font-semibold text-paper ${easy ? "h-14 text-lg" : "h-11"}`}
        >
          Send
        </button>
      </div>
    </section>
  );
}

type BrowserRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};
