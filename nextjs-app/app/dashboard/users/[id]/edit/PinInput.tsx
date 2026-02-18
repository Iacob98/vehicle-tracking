'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { generateDriverPin } from '@/lib/schemas/users.schema';

interface PinInputProps {
  currentPin?: string | null;
}

export default function PinInput({ currentPin }: PinInputProps) {
  const [pin, setPin] = useState('');

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium mb-2">
        Новый PIN-код
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          name="new_password"
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            setPin(val);
          }}
          placeholder="6 цифр"
          className="font-mono text-lg tracking-widest"
          maxLength={6}
          pattern="\d{6}"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setPin(generateDriverPin())}
        >
          Сгенерировать
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Оставьте пустым, чтобы не менять. Текущий PIN: <span className="font-mono">{currentPin || 'не задан'}</span>
      </p>
    </div>
  );
}
