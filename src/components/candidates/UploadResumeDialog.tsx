"use client";

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_MB = 10;

interface UploadResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => void | Promise<void>;
  isUploading?: boolean;
}

export function UploadResumeDialog({
  open,
  onOpenChange,
  onUpload,
  isUploading = false,
}: UploadResumeDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && ACCEPTED_TYPES.includes(f.type)) setFile(f);
  };

  const handleSubmit = async () => {
    if (file) {
      await onUpload(file);
      setFile(null);
      onOpenChange(false);
    }
  };

  const isValid = file && ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_SIZE_MB * 1024 * 1024;
  const sizeError = file && file.size > MAX_SIZE_MB * 1024 * 1024;
  const typeError = file && !ACCEPTED_TYPES.includes(file.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-hidden">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors min-w-0 overflow-hidden',
              dragOver ? 'border-sky-blue bg-sky-blue/5' : 'border-border',
              file && 'border-sky-blue bg-sky-blue/5'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 min-w-0">
                <FileText className="w-8 h-8 text-sky-blue flex-shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate block">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX up to {MAX_SIZE_MB}MB
                </p>
              </>
            )}
          </div>
          {(sizeError || typeError) && (
            <p className="text-sm text-destructive">
              {sizeError ? `File must be under ${MAX_SIZE_MB}MB` : 'Please upload a PDF or Word document'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
