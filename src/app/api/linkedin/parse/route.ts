import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export const maxDuration = 30;

interface Profile {
  name: string | null;
  title: string | null;
  location: string | null;
  contact: {
    email: string | null;
    linkedin: string | null;
    company_website: string | null;
    portfolio: string | null;
    instagram: string | null;
  };
  top_skills: string[];
  languages: string[];
  summary: string | null;
  experience: {
    company: string | null;
    title: string | null;
    duration: string | null;
    location: string | null;
    description: string | null;
  }[];
  education: {
    institution: string | null;
    degree: string | null;
    years: string | null;
  }[];
  honors_awards: string[];
}

function parseLinkedInPdfText(text: string): Profile {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const profile: Profile = {
    name: null,
    title: null,
    location: null,
    contact: {
      email: null,
      linkedin: null,
      company_website: null,
      portfolio: null,
      instagram: null,
    },
    top_skills: [],
    languages: [],
    summary: null,
    experience: [],
    education: [],
    honors_awards: [],
  };

  const lower = text.toLowerCase();
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) profile.contact.email = emailMatch[0];

  const linkedInMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedInMatch) profile.contact.linkedin = `https://www.${linkedInMatch[0]}`;

  const sections = [
    "experience",
    "education",
    "skills",
    "honors",
    "certifications",
    "languages",
    "summary",
    "about",
  ];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    if (!profile.name && line.length > 2 && line.length < 80 && !sections.some((s) => lineLower.includes(s))) {
      const next = lines[i + 1];
      if (next && next.length < 100 && !next.match(/^\d/)) {
        profile.name = line;
        if (next && !next.match(/^https?:\/\//) && !next.match(/^[\w.-]+@/)) {
          profile.title = next;
          i++;
        }
        i++;
        continue;
      }
    }

    if (lineLower.includes("location") || lineLower.includes("📍")) {
      const loc = line.replace(/^(location|📍)\s*/i, "").trim() || lines[i + 1];
      if (loc && !profile.location) profile.location = loc;
    }

    if (lineLower.includes("top skills") || lineLower === "skills") {
      let j = i + 1;
      while (j < lines.length && lines[j].length < 50 && !sections.some((s) => lines[j].toLowerCase().includes(s))) {
        const skill = lines[j].replace(/^\d+\.?\s*/, "").trim();
        if (skill && skill.length > 1) profile.top_skills.push(skill);
        j++;
      }
      profile.top_skills = profile.top_skills.slice(0, 15);
    }

    if (lineLower.includes("summary") || lineLower.includes("about")) {
      const parts: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].length > 10 && !sections.some((s) => lines[j].toLowerCase().includes(s))) {
        parts.push(lines[j]);
        j++;
      }
      if (parts.length) profile.summary = parts.join("\n").slice(0, 2000);
    }

    if (lineLower.includes("experience")) {
      let j = i + 1;
      while (j < lines.length && j < i + 20) {
        const expLine = lines[j];
        if (expLine.match(/\d{4}\s*[-–]\s*(\d{4}|present)/i) || expLine.length > 10) {
          profile.experience.push({
            company: expLine,
            title: lines[j - 1] || null,
            duration: null,
            location: null,
            description: null,
          });
        }
        j++;
      }
      profile.experience = profile.experience.slice(0, 10);
    }

    if (lineLower.includes("education")) {
      let j = i + 1;
      while (j < lines.length && j < i + 15) {
        const eduLine = lines[j];
        if (eduLine.length > 3 && eduLine.length < 100) {
          profile.education.push({
            institution: eduLine,
            degree: null,
            years: null,
          });
        }
        j++;
      }
      profile.education = profile.education.slice(0, 5);
    }

    i++;
  }

  if (!profile.name && lines.length > 0) {
    profile.name = lines[0];
  }
  if (!profile.title && lines.length > 1) {
    profile.title = lines[1];
  }

  return profile;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }
    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ detail: "File must be a PDF" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });

    if (!text || text.length < 50) {
      return NextResponse.json(
        { detail: "Could not extract meaningful text from PDF. Ensure it is a LinkedIn profile export." },
        { status: 400 }
      );
    }

    const profile = parseLinkedInPdfText(text);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("LinkedIn parse error:", err);
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
