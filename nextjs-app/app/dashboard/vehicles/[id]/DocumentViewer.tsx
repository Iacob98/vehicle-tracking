'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface DocumentViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

export function DocumentViewer({ fileUrl, fileName, onClose }: DocumentViewerProps) {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const isPDF = fileUrl.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>📄 {fileName}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fileUrl, '_blank')}
              >
                📤 Открыть в новой вкладке
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = fileUrl;
                  link.download = fileName;
                  link.click();
                }}
              >
                💾 Скачать
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isPDF && (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] border rounded"
              title={fileName}
            />
          )}

          {isImage && (
            <div className="relative w-full h-[70vh]">
              <Image
                src={fileUrl}
                alt={fileName}
                fill
                className="object-contain"
              />
            </div>
          )}

          {!isPDF && !isImage && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                Предпросмотр недоступен для этого типа файла
              </p>
              <Button onClick={() => window.open(fileUrl, '_blank')}>
                📤 Открыть файл
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
