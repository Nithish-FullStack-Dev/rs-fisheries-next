"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AgentFormValues, agentSchema } from "../types/type";

const AddAgentPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      isActive: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AgentFormValues) => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          formData.append(key, value.toString());
        }
      });
      const response = await axios.post("/api/agent", formData, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Agent created successfully");
      reset();
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agents-all"] });
      router.push("/agent");
    },
    onError: (error: any) => {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to create agent"
        : error.message || "Failed to create agent";
      toast.error(msg);
    },
  });

  const onSubmit = (data: AgentFormValues) => {
    mutation.mutate(data);
  };

  const ErrorMsg = ({ error }: { error?: { message?: string } }) => {
    if (!error?.message) return null;
    return <p className="text-xs text-red-500 mt-1">{error.message}</p>;
  };

  const RequiredStar = () => <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="mx-auto py-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-center gap-4 mb-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Add New Agent</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* --- Basic Info --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg shadow-sm bg-card">
          <h2 className="text-lg font-semibold md:col-span-2 border-b pb-2 mb-2">
            Basic Information
          </h2>

          {/* Agent Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Agent Name <RequiredStar />
            </Label>
            <Input
              id="name"
              placeholder="Enter agent name"
              {...register("name")}
            />
            <ErrorMsg error={errors.name} />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <RequiredStar />
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="9876543210"
              maxLength={10}
              {...register("phone")}
            />
            <ErrorMsg error={errors.phone} />
          </div>

          {/* Address (full width) */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Full address here..."
              className="resize-none h-24"
              {...register("address")}
            />
            <ErrorMsg error={errors.address} />
          </div>
        </div>

        {/* --- Status --- */}
        <div className="flex items-center space-x-2 p-6 border rounded-lg shadow-sm bg-card">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Switch
                id="isActive"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Is Active Agent?
          </Label>
        </div>

        {/* --- Submit --- */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" onClick={() => reset()}>
            Reset
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mutation.isPending ? "Creating..." : "Create Agent"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddAgentPage;
