import prisma from "./lib/prisma";

async function main() {
  try {
    console.log("--- PRISMA DIAGNOSTICS ---");
    // @ts-ignore
    const dmmf = (prisma as any)._baseDmmf || (prisma as any)._dmmf;
    
    if (!dmmf) {
      console.log("Could not find DMMF on prisma instance.");
    } else {
      console.log("DMMF found.");
      // In newer Prisma, it's under datamodel.models
      const models = dmmf.datamodel?.models || dmmf.modelMap;
      
      if (Array.isArray(models)) {
        const agentLoadingModel = models.find((m: any) => m.name === "AgentLoading");
        if (agentLoadingModel) {
          console.log("AgentLoading Model found in DMMF.");
          const field = agentLoadingModel.fields.find((f: any) => f.name === "localVehicle");
          console.log("Field 'localVehicle' exists?", field ? "YES" : "NO");
        } else {
          console.log("AgentLoading Model NOT found in DMMF models array.");
        }
      } else if (models && typeof models === 'object') {
         const agentLoadingModel = models["AgentLoading"];
         if (agentLoadingModel) {
            console.log("AgentLoading Model found in DMMF modelMap.");
            const field = agentLoadingModel.fields.find((f: any) => f.name === "localVehicle");
            console.log("Field 'localVehicle' exists?", field ? "YES" : "NO");
         } else {
            console.log("AgentLoading Model NOT found in DMMF modelMap.");
         }
      }
    }

    // Try dummy create (with catch)
    try {
        console.log("Test: prisma.agentLoading.create({ data: { localVehicle: 'test' } })");
        // @ts-ignore
        await prisma.agentLoading.create({
            data: {
                fishCode: "TEST",
                agentName: "TEST",
                billNo: "TEST-DIAG-" + Date.now(),
                village: "TEST",
                date: new Date(),
                localVehicle: "TEST-VEHICLE"
            }
        });
        console.log("SUCCESS: Created record with localVehicle!");
    } catch (e: any) {
        console.log("FAILED TEST:", e.message);
    }

  } catch (err) {
    console.error("Diagnostic error:", err);
  } finally {
    process.exit();
  }
}

main();
