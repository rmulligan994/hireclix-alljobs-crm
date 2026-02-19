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

/**
 * Parse LinkedIn profile PDF text using regex patterns (ported from Python reference).
 * LinkedIn PDFs have a consistent structure: Contact, Top Skills, Languages, Honors-Awards, Summary, Experience, Education.
 */
function parseLinkedInPdfText(text: string): Profile {
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

  // Contact: email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) profile.contact.email = emailMatch[0];

  // Contact: LinkedIn URL (username can include letters, numbers, hyphens, underscores)
  const linkedInMatch = text.match(/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (linkedInMatch) {
    profile.contact.linkedin = `https://www.linkedin.com/in/${linkedInMatch[1]}`;
  }

  // Name: first substantial line (capitalized words) or from honors/summary
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
  if (nameMatch) {
    profile.name = nameMatch[1].trim();
  } else {
    // Fallback: look for "FirstName LastName" pattern in first 800 chars (before Contact)
    const lead = text.slice(0, 800);
    const altMatch = lead.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
    if (altMatch && !/^(Contact|Summary|Experience|Education|Skills|LinkedIn)/i.test(altMatch[1])) {
      profile.name = altMatch[1].trim();
    }
  }

  // Location: City, State/Country before Summary (e.g. "San Francisco, California" or "London, United Kingdom")
  const locationMatch = text.match(/([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*,\s*(?:[A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))\s*Summary/i);
  if (locationMatch) {
    profile.location = locationMatch[1].trim();
  }
  // Fallback: "Location" label
  if (!profile.location) {
    const locLabelMatch = text.match(/(?:Location|📍)\s*[:]?\s*([^\n]+)/i);
    if (locLabelMatch) profile.location = locLabelMatch[1].trim();
  }

  // Title: typically the line between name and location. Look for content before location pattern.
  if (profile.name && !profile.title) {
    const afterName = text.slice(text.indexOf(profile.name) + profile.name.length);
    // Content before "City, State Summary" or before "Summary"
    const beforeSummary = afterName.split(/\s+Summary/i)[0];
    const lines = beforeSummary.split(/\n/).map((l) => l.trim()).filter(Boolean);
    // First non-URL, non-email line is often the title
    const titleLine = lines.find((l) => l.length > 2 && l.length < 120 && !/^https?:\/\//.test(l) && !/^[\w.-]+@/.test(l));
    if (titleLine) profile.title = titleLine;
  }

  // Top Skills: section between "Top Skills" (or "Skills") and Languages/Honors/Summary
  const skillsMatch =
    text.match(/Top\s+Skills\s+([\s\S]*?)(?=Languages|Honors|Summary|Experience|Education|$)/i) ??
    text.match(/^Skills\s+([\s\S]*?)(?=Languages|Honors|Summary|Experience|Education|$)/im);
  if (skillsMatch) {
    const skillsText = skillsMatch[1];
    const skills = skillsText
      .split(/\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && !s.startsWith("www.") && !s.includes("@"));
    profile.top_skills = skills.slice(0, 15);
  }

  // Languages
  const languagesMatch = text.match(/Languages\s+([\s\S]*?)(?=Honors|Summary|Experience|$)/i);
  if (languagesMatch) {
    profile.languages = languagesMatch[1]
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1);
  }

  // Honors-Awards
  const honorsMatch = text.match(/Honors[- ]?Awards\s+([\s\S]*?)(?=Summary|Experience|Education|$)/i);
  if (honorsMatch) {
    profile.honors_awards = honorsMatch[1]
      .split(/\n/)
      .map((h) => h.trim())
      .filter((h) => h.length > 5);
  }

  // Summary
  const summaryMatch = text.match(/Summary\s+([\s\S]*?)(?=Experience|Education|$)/i);
  if (summaryMatch) {
    const summary = summaryMatch[1].trim().replace(/\s+/g, " ");
    if (summary.length > 20) profile.summary = summary.slice(0, 2000);
  }

  // Experience: entries with duration patterns
  const expMatch = text.match(/Experience\s+([\s\S]*?)(?=Education|$)/i);
  if (expMatch) {
    const expText = expMatch[1];
    const lines = expText.split(/\n/).map((l) => l.trim()).filter(Boolean);
    let currentEntry: Profile["experience"][0] | null = null;
    for (const line of lines) {
      if (/\d{4}.*?(?:Present|\d{4})/.test(line)) {
        if (currentEntry) profile.experience.push(currentEntry);
        currentEntry = { company: null, title: null, duration: line, location: null, description: null };
      } else if (currentEntry && /,\s*[A-Z]{2}|,\s*[A-Z][a-z]+/.test(line) && !currentEntry.location) {
        currentEntry.location = line;
      } else if (currentEntry) {
        if (!currentEntry.title) currentEntry.title = line.length < 100 ? line : null;
        else if (!currentEntry.company && line.length < 100) currentEntry.company = line;
      }
    }
    if (currentEntry) profile.experience.push(currentEntry);
    profile.experience = profile.experience.slice(0, 10);
  }

  // Education
  const eduMatch = text.match(/Education\s+([\s\S]*?)(?=$|Page\s+\d+)/i);
  if (eduMatch) {
    const eduText = eduMatch[1];
    const lines = eduText.split(/\n/).map((l) => l.trim()).filter(Boolean);
    let currentEntry: Profile["education"][0] | null = null;
    for (const line of lines) {
      if (/[A-Z]{2,}|·|,/.test(line)) {
        if (currentEntry?.institution) profile.education.push(currentEntry);
        currentEntry = { institution: null, degree: line, years: null };
      } else if (/\d{4}/.test(line) && currentEntry) {
        currentEntry.years = line;
      } else {
        if (currentEntry) profile.education.push(currentEntry);
        currentEntry = { institution: line, degree: null, years: null };
      }
    }
    if (currentEntry) profile.education.push(currentEntry);
    profile.education = profile.education.slice(0, 5);
  }

  // Fallbacks: first lines as name/title if not found
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const sectionKeywords = ["contact", "experience", "education", "skills", "summary", "honors", "languages"];
  if (!profile.name && lines.length > 0) {
    const first = lines[0];
    if (first.length < 80 && !sectionKeywords.some((k) => first.toLowerCase().includes(k))) {
      profile.name = first;
    }
  }
  if (!profile.title && lines.length > 1 && profile.name) {
    const second = lines[1];
    if (second.length < 100 && !/^\d|^https?:\/\/|^[\w.-]+@/.test(second) && !sectionKeywords.some((k) => second.toLowerCase().includes(k))) {
      profile.title = second;
    }
  }
  // Fallback: use first sentence of summary as title if it looks like a role
  if (!profile.title && profile.summary && profile.summary.length < 120) {
    profile.title = profile.summary;
  } else if (!profile.title && profile.summary) {
    const firstSentence = profile.summary.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length < 100) profile.title = firstSentence;
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
