"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AgentFormValues, agentSchema } from "../../types/type";

export default function EditAgentPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formReady, setFormReady] = React.useState(false);

  const { data: agentData, isLoading: isFetching } = useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/agent/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(agentSchema),
  });

  useEffect(() => {
    if (!agentData) return;
    reset({
      name: agentData.name,
      phone: agentData.phone,
      address: agentData.address || "",
      isActive: agentData.isActive,
    });
    setFormReady(true);
  }, [agentData, reset]);

  const mutation = useMutation({
    mutationFn: async (values: AgentFormValues) => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "")
          formData.append(key, String(value));
      });
      const { data } = await axios.patch(`/api/agent/${id}`, formData);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Agent updated successfully");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent", id] });
      router.push("/agent");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Update failed");
    },
  });

  if (isFetching || !formReady)
    return <div className="p-10 text-center">Loading agent data...</div>;

  const RequiredStar = () => <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="mx-auto py-10">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          Edit Agent: {agentData?.name}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-8"
      >
        {/* --- Basic Info --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg bg-card shadow-sm">
          <h2 className="text-lg font-semibold md:col-span-2 border-b pb-2">
            Basic Information
          </h2>

          <div className="space-y-2">
            <Label>
              Agent Name <RequiredStar />
            </Label>
            <Input {...register("name")} placeholder="Enter agent name" />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Phone Number <RequiredStar />
            </Label>
            <Input {...register("phone")} maxLength={10} placeholder="9876543210" />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Textarea 
              {...register("address")} 
              placeholder="Full address here..." 
              className="resize-none h-24"
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>
            )}
          </div>
        </div>

        {/* --- Status --- */}
        <div className="flex items-center space-x-2 p-6 border rounded-lg bg-card shadow-sm">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label>Is Active Agent?</Label>
        </div>

        {/* --- Actions --- */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
