"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const rentSchema = z.object({
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  rentalAgency: z.string().min(1, "Rental agency is required"),
  rentalRatePerDay: z.string().min(1, "Daily rate is required"),
  assignedDriverId: z.string().optional(),
  remarks: z.string().optional(),
});

type RentFormType = z.infer<typeof rentSchema>;

export function RentVehicleForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RentFormType>({
    resolver: zodResolver(rentSchema),
  });

  const addMutation = useMutation({
    mutationFn: async (payload: RentFormType & { ownership: string }) => {
      const { data: res } = await axios.post("/api/vehicles/rent", payload, {
        withCredentials: true,
      });
      return res;
    },
    onSuccess: (data) => {
      toast.success(data?.message ?? "Rent vehicle added successfully");
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Error adding vehicle");
    },
  });

  const onSubmit = (data: RentFormType) => {
    const payload = { ...data, ownership: "RENT" };
    addMutation.mutate(payload);
  };

  const loading = addMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* VEHICLE NUMBER */}
      <div className="flex flex-col space-y-1">
        <Label>Vehicle Number *</Label>
        <Input
          {...register("vehicleNumber")}
          placeholder="Enter vehicle number"
        />
        {errors.vehicleNumber && (
          <p className="text-red-600 text-sm">{errors.vehicleNumber.message}</p>
        )}
      </div>

      {/* RENTAL AGENCY */}
      <div className="flex flex-col space-y-1">
        <Label>Rental Agency *</Label>
        <Input {...register("rentalAgency")} placeholder="Rental agency name" />
        {errors.rentalAgency && (
          <p className="text-red-600 text-sm">{errors.rentalAgency.message}</p>
        )}
      </div>

      {/* RATE PER DAY */}
      <div className="flex flex-col space-y-1">
        <Label>Rate Per Day *</Label>
        <Input {...register("rentalRatePerDay")} placeholder="Daily rate" />
        {errors.rentalRatePerDay && (
          <p className="text-red-600 text-sm">
            {errors.rentalRatePerDay.message}
          </p>
        )}
      </div>

      {/* DRIVER ID */}
      <div className="flex flex-col space-y-1">
        <Label>Assigned Driver ID (optional)</Label>
        <Input {...register("assignedDriverId")} placeholder="Driver ID" />
        {errors.assignedDriverId && (
          <p className="text-red-600 text-sm">
            {errors.assignedDriverId.message}
          </p>
        )}
      </div>

      {/* REMARKS */}
      <div className="flex flex-col space-y-1">
        <Label>Remarks</Label>
        <Input {...register("remarks")} placeholder="Any notes" />
        {errors.remarks && (
          <p className="text-red-600 text-sm">{errors.remarks.message}</p>
        )}
      </div>

      {/* SUBMIT BUTTON */}
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
        Save Rent Vehicle
      </Button>
    </form>
  );
}
