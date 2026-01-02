"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import axios, { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { OwnFormType, ownSchema, useAvalibleDrivers } from "./types";

export function OwnVehicleForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<OwnFormType>({
    resolver: zodResolver(ownSchema),
  });
  const [selected, setSelected] = useState("");
  const queryClient = useQueryClient();

  const { data: drivers, isLoading, isError } = useAvalibleDrivers();

  const addMutation = useMutation({
    mutationFn: async (payload: OwnFormType & { ownership: string }) => {
      const { data: res } = await axios.post("/api/vehicles/own", payload, {
        withCredentials: true,
      });
      return res;
    },
    onSuccess: (data) => {
      toast.success(data?.message ?? "Vehicle added successfully");
      queryClient.invalidateQueries({ queryKey: ["own-vehicles"] });
      onSuccess();
    },
    onError: async (err: any) => {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data.message ?? "Something went wrong");
      } else {
        toast.error(err.message ?? "Something went wrong");
      }
    },
  });

  const onSubmit = (data: OwnFormType) => {
    addMutation.mutate({
      ...data,
      ownership: "OWN",
      assignedDriverId: selected,
    });
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

        <div className="space-y-3">
          <label className="text-sm font-medium">Select Driver</label>

          <Select onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choose driver" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : drivers?.length ? (
                drivers.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">
                  No available drivers
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
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
