import { useState } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface AdvancedSearchFields {
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  skills: string[];
  location: string;
  dateAddedFrom?: Date;
  dateAddedTo?: Date;
  lastContactedFrom?: Date;
  lastContactedTo?: Date;
}

interface AdvancedSearchPanelProps {
  isOpen: boolean;
  fields: AdvancedSearchFields;
  onChange: (fields: AdvancedSearchFields) => void;
  onSearch: () => void;
  onClear: () => void;
  availableSkills?: string[];
}

export const AdvancedSearchPanel = ({
  isOpen,
  fields,
  onChange,
  onSearch,
  onClear,
  availableSkills = [],
}: AdvancedSearchPanelProps) => {
  const [skillInput, setSkillInput] = useState('');
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  if (!isOpen) return null;

  const updateField = <K extends keyof AdvancedSearchFields>(
    key: K,
    value: AdvancedSearchFields[K]
  ) => {
    onChange({ ...fields, [key]: value });
  };

  const addSkill = (skill: string) => {
    if (skill && !fields.skills.includes(skill)) {
      updateField('skills', [...fields.skills, skill]);
    }
    setSkillInput('');
    setShowSkillSuggestions(false);
  };

  const removeSkill = (skill: string) => {
    updateField('skills', fields.skills.filter(s => s !== skill));
  };

  const filteredSkills = availableSkills.filter(
    s => s.toLowerCase().includes(skillInput.toLowerCase()) && !fields.skills.includes(s)
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-2 animate-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Name */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Name</Label>
          <Input
            value={fields.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder="First or last name..."
            className="bg-background border-border"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Email</Label>
          <Input
            type="email"
            value={fields.email}
            onChange={e => updateField('email', e.target.value)}
            placeholder="Email address..."
            className="bg-background border-border"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Phone</Label>
          <Input
            value={fields.phone}
            onChange={e => updateField('phone', e.target.value)}
            placeholder="Phone number..."
            className="bg-background border-border"
          />
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Company</Label>
          <Input
            value={fields.company}
            onChange={e => updateField('company', e.target.value)}
            placeholder="Company name..."
            className="bg-background border-border"
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Job Title</Label>
          <Input
            value={fields.title}
            onChange={e => updateField('title', e.target.value)}
            placeholder="Job title..."
            className="bg-background border-border"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Location</Label>
          <Input
            value={fields.location}
            onChange={e => updateField('location', e.target.value)}
            placeholder="City or state..."
            className="bg-background border-border"
          />
        </div>

        {/* Skills */}
        <div className="space-y-2 md:col-span-2 lg:col-span-3">
          <Label className="text-sm text-muted-foreground">Skills</Label>
          <div className="relative">
            <Input
              value={skillInput}
              onChange={e => {
                setSkillInput(e.target.value);
                setShowSkillSuggestions(true);
              }}
              onFocus={() => setShowSkillSuggestions(true)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill(skillInput);
                }
              }}
              placeholder="Type to add skills..."
              className="bg-background border-border"
            />
            {showSkillSuggestions && skillInput && filteredSkills.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                {filteredSkills.slice(0, 10).map(skill => (
                  <button
                    key={skill}
                    onClick={() => addSkill(skill)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            )}
          </div>
          {fields.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {fields.skills.map(skill => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-sky-blue/10 text-sky-blue border-sky-blue cursor-pointer"
                  onClick={() => removeSkill(skill)}
                >
                  {skill}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Date Added Range */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Date Added</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !fields.dateAddedFrom && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {fields.dateAddedFrom ? format(fields.dateAddedFrom, "PP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <CalendarComponent
                  mode="single"
                  selected={fields.dateAddedFrom}
                  onSelect={d => updateField('dateAddedFrom', d)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !fields.dateAddedTo && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {fields.dateAddedTo ? format(fields.dateAddedTo, "PP") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <CalendarComponent
                  mode="single"
                  selected={fields.dateAddedTo}
                  onSelect={d => updateField('dateAddedTo', d)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Last Contacted Range */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Last Contacted</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !fields.lastContactedFrom && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {fields.lastContactedFrom ? format(fields.lastContactedFrom, "PP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <CalendarComponent
                  mode="single"
                  selected={fields.lastContactedFrom}
                  onSelect={d => updateField('lastContactedFrom', d)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !fields.lastContactedTo && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {fields.lastContactedTo ? format(fields.lastContactedTo, "PP") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <CalendarComponent
                  mode="single"
                  selected={fields.lastContactedTo}
                  onSelect={d => updateField('lastContactedTo', d)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClear}>
          Clear All
        </Button>
        <Button onClick={onSearch} className="bg-sky-blue hover:bg-sky-blue/90 text-white">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
    </div>
  );
};
