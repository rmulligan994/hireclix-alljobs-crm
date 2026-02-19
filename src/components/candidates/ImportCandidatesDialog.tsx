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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileSpreadsheet, FileText, Loader2, Upload, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { candidateService, resumeService } from "@/services";
import { getApiBase } from "@/lib/api";
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
  const [activeTab, setActiveTab] = useState<"csv" | "resume">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Resume reader state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeProfile, setResumeProfile] = useState<{
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    title: string | null;
    location: string | null;
    linkedinUrl: string | null;
    tags: string[];
  } | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

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
    setImportProgress({ current: 0, total: parsedRows.length });
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      setImportProgress({ current: i + 1, total: parsedRows.length });
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
    setImportProgress(null);
    setImporting(false);
    if (created > 0) onImportComplete?.();
  };

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      setResumeError("Please select a PDF file");
      return;
    }
    setResumeFile(file);
    setResumeError(null);
    setResumeProfile(null);
    setResumeLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const base = getApiBase();
      const url = `${base}${base.endsWith("/") ? "" : "/"}api/resume/parse`;
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      let data: { detail?: string; profile?: unknown };

      if (contentType.includes("application/json")) {
        data = (await res.json()) as { detail?: string; profile?: unknown };
      } else {
        const text = await res.text();
        if (text.startsWith("<") || text.startsWith("<!")) {
          throw new Error(
            res.status === 404
              ? "API route not found. Ensure the app is deployed with the resume parse route."
              : `Server error (${res.status}). The PDF may be unsupported or the server failed to process it.`
          );
        }
        try {
          data = JSON.parse(text) as { detail?: string; profile?: unknown };
        } catch {
          throw new Error(text.slice(0, 200) || "Invalid server response");
        }
      }

      if (!res.ok) {
        throw new Error(data.detail || `Upload failed (${res.status})`);
      }

      const profile = data.profile as {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
        company?: string | null;
        title?: string | null;
        location?: string | null;
        linkedinUrl?: string | null;
        tags?: string[];
      } | null;
      setResumeProfile(profile ? {
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        company: profile.company ?? null,
        title: profile.title ?? null,
        location: profile.location ?? null,
        linkedinUrl: profile.linkedinUrl ?? null,
        tags: profile.tags ?? [],
      } : null);
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setResumeLoading(false);
    }
  };

  const handleResumeAddCandidate = async () => {
    if (!resumeProfile || !resumeFile) return;
    setImporting(true);
    setResumeError(null);

    const data: CreateCandidateData = {
      firstName: resumeProfile.firstName || undefined,
      lastName: resumeProfile.lastName || undefined,
      email: resumeProfile.email || undefined,
      phone: resumeProfile.phone || undefined,
      company: resumeProfile.company || undefined,
      title: resumeProfile.title || undefined,
      location: resumeProfile.location || undefined,
      linkedinUrl: resumeProfile.linkedinUrl || undefined,
      tags: resumeProfile.tags?.length ? resumeProfile.tags : undefined,
      source: "Resume Import",
    };

    try {
      const candidate = await candidateService.create(data);
      await resumeService.upload(candidate.id, resumeFile);
      onImportComplete?.();
      setResumeProfile(null);
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Failed to add candidate");
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

  const resetResume = () => {
    setResumeFile(null);
    setResumeProfile(null);
    setResumeError(null);
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-heading text-xl text-foreground">Import Candidates</DialogTitle>
          <DialogDescription>
            Import from CSV with field mapping, or upload a resume PDF to extract candidate data.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "csv" | "resume"); resetCsv(); resetResume(); }} className="flex flex-col min-h-0 flex-1">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="resume" className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-sky-blue" />
              Resume reader
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="mt-4 flex-1 overflow-y-auto overflow-x-hidden min-h-0 data-[state=inactive]:hidden">
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
              <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
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

                <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between border-border">
                      <span className="text-sm font-medium">
                        Preview data ({Math.min(parsedRows.length, 20)} of {parsedRows.length} rows)
                      </span>
                      {previewOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 border rounded-lg overflow-auto max-h-[280px]">
                      <Table className="min-w-full">
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="text-xs font-medium w-10">#</TableHead>
                              {csvHeaders.map((h) => (
                                <TableHead key={h} className="text-xs font-medium whitespace-nowrap px-3">
                                  {h}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedRows.slice(0, 20).map((row, i) => (
                              <TableRow key={i} className="border-border">
                                <TableCell className="text-xs text-muted-foreground px-3 py-2">
                                  {i + 1}
                                </TableCell>
                                {csvHeaders.map((h) => (
                                  <TableCell key={h} className="text-xs max-w-[200px] truncate px-3 py-2" title={row[h]}>
                                    {row[h] || "—"}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

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
                  {importing ? `Importing ${importProgress?.current ?? 0} / ${importProgress?.total ?? parsedRows.length}` : `Import ${parsedRows.length} candidates`}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="resume" className="mt-4 flex-1 overflow-y-auto overflow-x-hidden min-h-0 data-[state=inactive]:hidden">
            {!resumeProfile ? (
              <div
                onClick={() => !resumeLoading && resumeInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  resumeLoading ? "opacity-60 cursor-wait" : "hover:border-sky-blue hover:bg-sky-blue/5"
                } border-border`}
              >
                {resumeLoading ? (
                  <>
                    <Loader2 className="w-10 h-10 mx-auto text-sky-blue animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Extracting candidate data...</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">Upload resume PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">Works with any resume or LinkedIn profile export</p>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleResumeFileChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Candidate Preview</span>
                  </div>
                  <dl className="divide-y divide-border text-sm">
                    {[
                      { label: "First Name", value: resumeProfile.firstName || "—" },
                      { label: "Last Name", value: resumeProfile.lastName || "—" },
                      { label: "Email", value: resumeProfile.email || "—" },
                      { label: "Phone", value: resumeProfile.phone || "—" },
                      { label: "LinkedIn URL", value: resumeProfile.linkedinUrl || "—" },
                      { label: "Job Title", value: resumeProfile.title || "—" },
                      { label: "Company", value: resumeProfile.company || "—" },
                      { label: "Location", value: resumeProfile.location || "—" },
                      { label: "Source", value: "Resume Import" },
                      { label: "Tags / Skills", value: resumeProfile.tags?.length ? resumeProfile.tags.join(", ") : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-3 px-3 py-2">
                        <dt className="text-muted-foreground w-28 shrink-0">{label}</dt>
                        <dd className="text-foreground flex-1 break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {resumeError && <p className="text-sm text-destructive">{resumeError}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetResume}>Parse another</Button>
                  <Button onClick={handleResumeAddCandidate} disabled={importing} className="bg-sky-blue hover:bg-sky-blue/90">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add to Candidates
                  </Button>
                </div>
              </div>
            )}
            {resumeError && !resumeProfile && <p className="text-sm text-destructive mt-2">{resumeError}</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
