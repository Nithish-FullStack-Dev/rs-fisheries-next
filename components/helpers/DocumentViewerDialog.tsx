"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  src: string;
};

export function DocumentViewerDialog({
  open,
  onOpenChange,
  title,
  src,
}: Props) {
  const isPdf = src.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-black flex items-center justify-center">
          {isPdf ? (
            <Button
              variant="secondary"
              onClick={() => window.open(src, "_blank")}
            >
              Open PDF in new tab
            </Button>
          ) : (
            <img
              src={src}
              alt={title}
              className="max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
