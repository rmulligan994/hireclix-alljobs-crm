"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText, Loader2, Upload } from "lucide-react";
import { candidateService } from "@/services/candidateService";
import type { CreateCandidateData } from "@/types/Candidate";

const CANDIDATE_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "title", label: "Job Title" },
  { key: "location", label: "Location" },
  { key: "source", label: "Source" },
  { key: "tags", label: "Tags (comma-separated)" },
] as const;

const HEADER_ALIASES: Record<string, string> = {
  "first name": "firstName",
  "first_name": "firstName",
  "firstname": "firstName",
  "last name": "lastName",
  "last_name": "lastName",
  "lastname": "lastName",
  "email": "email",
  "email address": "email",
  "phone": "phone",
  "phone number": "phone",
  "mobile": "phone",
  "company": "company",
  "company name": "company",
  "organization": "company",
  "title": "title",
  "job title": "title",
  "job_title": "title",
  "position": "title",
  "location": "location",
  "city": "location",
  "source": "source",
  "tags": "tags",
  "skills": "tags",
};

interface ImportCandidatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ImportCandidatesDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportCandidatesDialogProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "linkedin">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // LinkedIn PDF state
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinProfile, setLinkedinProfile] = useState<{
    name: string | null;
    title: string | null;
    location: string | null;
    contact: { email: string | null; linkedin: string | null };
    top_skills: string[];
  } | null>(null);
  const linkedinInputRef = useRef<HTMLInputElement>(null);

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setImportResult({ created: 0, skipped: 0, errors: ["Please select a CSV file"] });
      return;
    }
    setCsvFile(file);
    setImportResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        setParsedRows(rows);
        setCsvHeaders(headers);
        const mapping: Record<string, string> = {};
        headers.forEach((h) => {
          const normalized = h.trim().toLowerCase();
          const match = HEADER_ALIASES[normalized];
          if (match) mapping[h] = match;
        });
        setFieldMapping(mapping);
      },
    });
  };

  const handleCsvImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setImportResult(null);
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const data: CreateCandidateData = {};
      CANDIDATE_FIELDS.forEach(({ key }) => {
        const csvCol = Object.entries(fieldMapping).find(([, v]) => v === key)?.[0];
        if (csvCol && row[csvCol] !== undefined && row[csvCol] !== "") {
          if (key === "tags") {
            data.tags = row[csvCol].split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
          } else {
            (data as Record<string, unknown>)[key] = row[csvCol].trim();
          }
        }
      });

      if (!data.email && !data.phone) {
        skipped++;
        errors.push(`Row ${i + 2}: Skipped (no email or phone)`);
        continue;
      }

      try {
        await candidateService.create(data);
        created++;
      } catch (err) {
        skipped++;
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }

    setImportResult({ created, skipped, errors: errors.slice(0, 10) });
    setImporting(false);
    if (created > 0) onImportComplete?.();
  };

  const handleLinkedinFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      setLinkedinError("Please select a PDF file");
      return;
    }
    setLinkedinFile(file);
    setLinkedinError(null);
    setLinkedinProfile(null);
    setLinkedinLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${basePath}/api/linkedin/parse`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { detail?: string; profile?: unknown };

      if (!res.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      const profile = data.profile as {
        name: string | null;
        title: string | null;
        location: string | null;
        contact?: { email?: string | null; linkedin?: string | null };
        top_skills?: string[];
      } | null;
      setLinkedinProfile(profile ? {
        name: profile.name ?? null,
        title: profile.title ?? null,
        location: profile.location ?? null,
        contact: {
          email: profile.contact?.email ?? null,
          linkedin: profile.contact?.linkedin ?? null,
        },
        top_skills: profile.top_skills ?? [],
      } : null);
    } catch (err) {
      setLinkedinError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLinkedinLoading(false);
    }
  };

  const handleLinkedinAddCandidate = async () => {
    if (!linkedinProfile) return;
    setImporting(true);
    setLinkedinError(null);

    const nameParts = (linkedinProfile.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const data: CreateCandidateData = {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: linkedinProfile.contact?.email || undefined,
      linkedinUrl: linkedinProfile.contact?.linkedin || undefined,
      title: linkedinProfile.title || undefined,
      location: linkedinProfile.location || undefined,
      tags: linkedinProfile.top_skills?.length ? linkedinProfile.top_skills : undefined,
      source: "LinkedIn Import",
    };

    try {
      await candidateService.create(data);
      onImportComplete?.();
      setLinkedinProfile(null);
      setLinkedinFile(null);
      if (linkedinInputRef.current) linkedinInputRef.current.value = "";
    } catch (err) {
      setLinkedinError(err instanceof Error ? err.message : "Failed to add candidate");
    } finally {
      setImporting(false);
    }
  };

  const resetCsv = () => {
    setCsvFile(null);
    setParsedRows([]);
    setCsvHeaders([]);
    setFieldMapping({});
    setImportResult(null);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const resetLinkedin = () => {
    setLinkedinFile(null);
    setLinkedinProfile(null);
    setLinkedinError(null);
    if (linkedinInputRef.current) linkedinInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">Import Candidates</DialogTitle>
          <DialogDescription>
            Import from CSV with field mapping, or upload a LinkedIn profile PDF.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "csv" | "linkedin"); resetCsv(); resetLinkedin(); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              LinkedIn PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {!csvFile ? (
              <div
                onClick={() => csvInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-sky-blue hover:bg-sky-blue/5 transition"
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
                <p className="text-xs text-muted-foreground mt-1">Map columns to candidate fields</p>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground">{csvFile.name} — {parsedRows.length} rows</p>
                  <Button variant="ghost" size="sm" onClick={resetCsv}>Change file</Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Field mapping</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CANDIDATE_FIELDS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-28 truncate">{label}</span>
                        <Select
                          value={(fieldMapping && Object.entries(fieldMapping).find(([, v]) => v === key)?.[0]) ?? ""}
                          onValueChange={(v) => setFieldMapping((prev) => {
                            const next = { ...prev };
                            Object.keys(next).forEach((k) => { if (next[k] === key) delete next[k]; });
                            if (v) next[v] = key;
                            return next;
                          })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {csvHeaders.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0 border rounded-lg p-2">
                  <p className="text-xs text-muted-foreground mb-2">Preview (first 5 rows)</p>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(parsedRows.slice(0, 5), null, 2)}
                  </pre>
                </ScrollArea>

                {importResult && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p>Created: {importResult.created} | Skipped: {importResult.skipped}</p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-1 text-muted-foreground list-disc list-inside">
                        {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleCsvImport}
                  disabled={importing || parsedRows.length === 0}
                  className="w-full bg-sky-blue hover:bg-sky-blue/90"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Import {parsedRows.length} candidates
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="linkedin" className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {!linkedinProfile ? (
              <div
                onClick={() => !linkedinLoading && linkedinInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  linkedinLoading ? "opacity-60 cursor-wait" : "hover:border-sky-blue hover:bg-sky-blue/5"
                } border-border`}
              >
                {linkedinLoading ? (
                  <>
                    <Loader2 className="w-10 h-10 mx-auto text-sky-blue animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Extracting profile data...</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">Upload LinkedIn PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">We&apos;ll extract the profile and add as a candidate</p>
                    <input
                      ref={linkedinInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleLinkedinFileChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-background/50">
                  <h3 className="font-semibold text-foreground">{linkedinProfile.name || "Unknown"}</h3>
                  {linkedinProfile.title && <p className="text-sm text-sky-blue">{linkedinProfile.title}</p>}
                  {linkedinProfile.location && <p className="text-xs text-muted-foreground">{linkedinProfile.location}</p>}
                  {linkedinProfile.contact?.email && <p className="text-xs mt-1">{linkedinProfile.contact.email}</p>}
                  {linkedinProfile.top_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {linkedinProfile.top_skills.slice(0, 5).map((s, i) => (
                        <span key={i} className="text-xs bg-sky-blue/20 text-sky-blue px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                {linkedinError && <p className="text-sm text-destructive">{linkedinError}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetLinkedin}>Parse another</Button>
                  <Button onClick={handleLinkedinAddCandidate} disabled={importing} className="bg-sky-blue hover:bg-sky-blue/90">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add to Candidates
                  </Button>
                </div>
              </div>
            )}
            {linkedinError && !linkedinProfile && <p className="text-sm text-destructive mt-2">{linkedinError}</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
