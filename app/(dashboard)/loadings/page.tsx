"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ClientLoading from "./components/ClientLoading";
import AgentLoading from "./components/AgentLoading";
import FormerLoading from "./components/FormerLoading";

export default function LoadingsPage() {
  const [activeTab, setActiveTab] = useState("fish");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Loadings</h1>
        <p className="text-slate-500">
          Manage fish, client, and agent loadings
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* ✅ YOUR THEME: #139BC3 (no blue-600) */}
        <TabsList
          className="
        relative inline-flex h-14 w-full max-w-2xl items-center justify-between
        rounded-full border border-[#139BC3]/25 bg-white/70 p-1
        shadow-[0_10px_30px_-18px_rgba(19,155,195,0.45)]
        backdrop-blur supports-[backdrop-filter]:bg-white/55
      "
        >
          {/* soft inner glow */}
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-[#139BC3]/15" />

          <TabsTrigger
            value="fish"
            className="
          relative h-12 flex-1 rounded-full px-3 sm:px-6 text-sm sm:text-base font-semibold
          text-slate-600 transition-all duration-200
          hover:text-slate-900
          data-[state=active]:bg-white
          data-[state=active]:text-[#139BC3]
          data-[state=active]:shadow-[0_10px_22px_-14px_rgba(19,155,195,0.55)]
          data-[state=active]:ring-1 data-[state=active]:ring-[#139BC3]/25
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#139BC3]/35
        "
          >
            Farmer
          </TabsTrigger>

          <TabsTrigger
            value="client"
            className="
          relative h-12 flex-1 rounded-full px-3 sm:px-6 text-sm sm:text-base font-semibold
          text-slate-600 transition-all duration-200
          hover:text-slate-900
          data-[state=active]:bg-white
          data-[state=active]:text-[#139BC3]
          data-[state=active]:shadow-[0_10px_22px_-14px_rgba(19,155,195,0.55)]
          data-[state=active]:ring-1 data-[state=active]:ring-[#139BC3]/25
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#139BC3]/35
        "
          >
            Client
          </TabsTrigger>

          <TabsTrigger
            value="agent"
            className="
          relative h-12 flex-1 rounded-full px-3 sm:px-6 text-sm sm:text-base font-semibold
          text-slate-600 transition-all duration-200
          hover:text-slate-900
          data-[state=active]:bg-white
          data-[state=active]:text-[#139BC3]
          data-[state=active]:shadow-[0_10px_22px_-14px_rgba(19,155,195,0.55)]
          data-[state=active]:ring-1 data-[state=active]:ring-[#139BC3]/25
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#139BC3]/35
        "
          >
            Agent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fish" className="mt-2">
          <FormerLoading />
        </TabsContent>

        <TabsContent value="client" className="mt-2">
          <ClientLoading />
        </TabsContent>

        <TabsContent value="agent" className="mt-2">
          <AgentLoading />
        </TabsContent>
      </Tabs>
    </div>
  );
}
