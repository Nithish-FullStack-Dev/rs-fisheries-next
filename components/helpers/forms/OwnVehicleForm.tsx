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

const indianVehicleNumberRegex = /^[A-Z]{2}\s[0-9]{2}\s[A-Z]{1,3}\s[0-9]{1,4}$/;

const ownSchema = z.object({
  vehicleNumber: z
    .string()
    .min(1, "Required")
    .regex(
      indianVehicleNumberRegex,
      "Invalid vehicle number format (e.g., MH 12 AB 1234)"
    ),

  manufacturer: z.string().optional(),
  model: z.string().optional(),
  yearOfManufacture: z.string().optional(),
  fuelType: z.enum(["DIESEL", "PETROL", "CNG", "ELECTRIC"], {
    error: "Fuel type is required",
  }),

  engineNumber: z.string().optional(),
  chassisNumber: z.string().optional(),

  capacityInTons: z.string().optional(),
  bodyType: z.string().optional(),

  rcValidity: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  fitnessExpiry: z.string().optional(),
  pollutionExpiry: z.string().optional(),
  permitExpiry: z.string().optional(),
  roadTaxExpiry: z.string().optional(),

  assignedDriverId: z.string().optional(),
  remarks: z.string().optional(),
});

type OwnFormType = z.infer<typeof ownSchema>;

export function OwnVehicleForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<OwnFormType>({
    resolver: zodResolver(ownSchema),
  });

  const addMutation = useMutation({
    mutationFn: async (payload: OwnFormType & { ownership: string }) => {
      const { data: res } = await axios.post("/api/vehicles/own", payload, {
        withCredentials: true,
      });
      return res;
    },
    onSuccess: (data) => {
      toast.success(data?.message ?? "Vehicle added successfully");
      onSuccess();
    },
    onError: async (err: any) => {
      const msg =
        err?.response?.data?.message || err?.message || "Something went wrong";

      toast.error(msg);
    },
  });

  const onSubmit = (data: OwnFormType) => {
    addMutation.mutate({ ...data, ownership: "OWN" });
  };

  const loading = addMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Vehicle Number */}
      <div className="flex flex-col space-y-1">
        <Label>Vehicle Number *</Label>
        <Input
          {...register("vehicleNumber")}
          placeholder="Enter vehicle number"
          onChange={(e) => {
            const value = e.target.value.toUpperCase();
            setValue("vehicleNumber", value, { shouldValidate: true });
          }}
        />
        {errors.vehicleNumber && (
          <p className="text-red-600 text-sm">{errors.vehicleNumber.message}</p>
        )}
      </div>

      {/* Basic */}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col space-y-1">
          <Label>Manufacturer</Label>
          <Input {...register("manufacturer")} placeholder="Manufacturer" />
          {errors.manufacturer && (
            <p className="text-red-600 text-sm">
              {errors.manufacturer.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Model</Label>
          <Input {...register("model")} placeholder="Model" />
          {errors.model && (
            <p className="text-red-600 text-sm">{errors.model.message}</p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Year of Manufacture</Label>
          <Input {...register("yearOfManufacture")} placeholder="2020" />
          {errors.yearOfManufacture && (
            <p className="text-red-600 text-sm">
              {errors.yearOfManufacture.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Fuel Type *</Label>
          <select
            {...register("fuelType")}
            className="border rounded-md px-3 py-2"
          >
            <option value="">Select Fuel</option>
            <option value="DIESEL">Diesel</option>
            <option value="PETROL">Petrol</option>
            <option value="CNG">CNG</option>
            <option value="ELECTRIC">Electric</option>
          </select>
          {errors.fuelType && (
            <p className="text-red-600 text-sm">{errors.fuelType.message}</p>
          )}
        </div>
      </div>

      {/* Technical */}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col space-y-1">
          <Label>Engine Number</Label>
          <Input {...register("engineNumber")} placeholder="Engine number" />
          {errors.engineNumber && (
            <p className="text-red-600 text-sm">
              {errors.engineNumber.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Chassis Number</Label>
          <Input {...register("chassisNumber")} placeholder="Chassis number" />
          {errors.chassisNumber && (
            <p className="text-red-600 text-sm">
              {errors.chassisNumber.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Capacity (Tons)</Label>
          <Input {...register("capacityInTons")} placeholder="e.g. 10.5" />
          {errors.capacityInTons && (
            <p className="text-red-600 text-sm">
              {errors.capacityInTons.message}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <Label>Body Type</Label>
          <Input {...register("bodyType")} placeholder="Open / Container" />
          {errors.bodyType && (
            <p className="text-red-600 text-sm">{errors.bodyType.message}</p>
          )}
        </div>
      </div>

      {/* Compliance */}
      <div className="grid grid-cols-2 gap-6">
        {[
          ["RC Validity", "rcValidity"],
          ["Insurance Expiry", "insuranceExpiry"],
          ["Fitness Expiry", "fitnessExpiry"],
          ["Pollution Expiry", "pollutionExpiry"],
          ["Permit Expiry", "permitExpiry"],
          ["Road Tax Expiry", "roadTaxExpiry"],
        ].map(([label, field]) => (
          <div key={field} className="flex flex-col space-y-1">
            <Label>{label}</Label>
            <Input type="date" {...register(field as any)} />
            {errors[field as keyof OwnFormType] && (
              <p className="text-red-600 text-sm">
                {errors[field as keyof OwnFormType]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Driver */}
      <div className="flex flex-col space-y-1">
        <Label>Assigned Driver ID (optional)</Label>
        <Input {...register("assignedDriverId")} placeholder="Driver ID" />
        {errors.assignedDriverId && (
          <p className="text-red-600 text-sm">
            {errors.assignedDriverId.message}
          </p>
        )}
      </div>

      {/* Remarks */}
      <div className="flex flex-col space-y-1">
        <Label>Remarks</Label>
        <Input {...register("remarks")} placeholder="Any notes" />
        {errors.remarks && (
          <p className="text-red-600 text-sm">{errors.remarks.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
        Save Own Vehicle
      </Button>
    </form>
  );
}
