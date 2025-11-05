'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Organization {
  id: string;
  name: string;
}

interface OrganizationSelectProps {
  organizations: Organization[];
  value?: string;
  onValueChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function OrganizationSelect({
  organizations,
  value,
  onValueChange,
  error,
  required = true,
}: OrganizationSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="organization_id">
        🏢 Организация {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="organization_id" className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder="Выберите организацию..." />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
