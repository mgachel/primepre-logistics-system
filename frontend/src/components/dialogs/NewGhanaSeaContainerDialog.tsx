import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { warehouseService } from "@/services/warehouseService";

interface NewGhanaSeaContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function NewGhanaSeaContainerDialog({
  open,
  onOpenChange,
  onCreated,
}: NewGhanaSeaContainerDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    container_number: "",
    arrival_date: "",
    location: "ACCRA",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.container_number || !formData.arrival_date) {
      toast({
        title: "Missing fields",
        description: "Container number and arrival date are required.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      // Replace with actual API call for creating Ghana Sea container
      await warehouseService.createGhanaSeaContainer({
        container_number: formData.container_number,
        arrival_date: formData.arrival_date,
        location: formData.location,
        notes: formData.notes,
      });
      toast({
        title: "Container added",
        description: `Container ${formData.container_number} created.`,
      });
      setFormData({
        container_number: "",
        arrival_date: "",
        location: "ACCRA",
        notes: "",
      });
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : "Unable to create container",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Ghana Sea Container</DialogTitle>
          <DialogDescription>Enter container details for Ghana Sea Cargo</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="container_number">Container Number</Label>
            <Input
              id="container_number"
              value={formData.container_number}
              onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
              placeholder="GHSEA12345"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrival_date">Arrival Date</Label>
            <Input
              id="arrival_date"
              type="date"
              value={formData.arrival_date}
              onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="ACCRA"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about the container"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Add Container
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
