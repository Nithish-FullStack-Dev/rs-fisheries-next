-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'finance', 'clerk', 'documentation', 'sales', 'readOnly');

-- CreateEnum
CREATE TYPE "VehicleOwnership" AS ENUM ('OWN', 'RENT');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'PETROL', 'CNG', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('OWN', 'RENT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('AC', 'UPI', 'CASH', 'CHEQUE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'readOnly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FishVariety" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FishVariety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormerLoading" (
    "id" TEXT NOT NULL,
    "fishCode" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "FarmerName" TEXT,
    "village" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "totalTrays" INTEGER NOT NULL DEFAULT 0,
    "totalLooseKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTrayKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormerLoading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormerItem" (
    "id" TEXT NOT NULL,
    "formerLoadingId" TEXT NOT NULL,
    "varietyCode" TEXT NOT NULL,
    "noTrays" INTEGER NOT NULL,
    "trayKgs" DOUBLE PRECISION NOT NULL,
    "loose" DOUBLE PRECISION NOT NULL,
    "totalKgs" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "FormerItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLoading" (
    "id" TEXT NOT NULL,
    "fishCode" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "totalTrays" INTEGER NOT NULL DEFAULT 0,
    "totalLooseKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTrayKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLoading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentItem" (
    "id" TEXT NOT NULL,
    "agentLoadingId" TEXT NOT NULL,
    "varietyCode" TEXT NOT NULL,
    "noTrays" INTEGER NOT NULL,
    "trayKgs" DOUBLE PRECISION NOT NULL,
    "loose" DOUBLE PRECISION NOT NULL,
    "totalKgs" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AgentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLoading" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fishCode" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "totalTrays" INTEGER NOT NULL DEFAULT 0,
    "totalLooseKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTrayKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalKgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLoading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientItem" (
    "id" TEXT NOT NULL,
    "clientLoadingId" TEXT NOT NULL,
    "varietyCode" TEXT NOT NULL,
    "noTrays" INTEGER NOT NULL,
    "trayKgs" DOUBLE PRECISION NOT NULL,
    "loose" DOUBLE PRECISION NOT NULL,
    "totalKgs" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ClientItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayment" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "paymentdetails" TEXT,
    "paymentRef" TEXT,
    "isInstallment" BOOLEAN NOT NULL DEFAULT false,
    "installments" INTEGER,
    "installmentNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNo" TEXT,

    CONSTRAINT "VendorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "reference" TEXT,
    "imageUrl" TEXT,
    "isInstallment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleEntry" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "trip" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "diesel" DOUBLE PRECISION DEFAULT 0,
    "service" DOUBLE PRECISION DEFAULT 0,
    "fastag" DOUBLE PRECISION DEFAULT 0,
    "eChallan" DOUBLE PRECISION DEFAULT 0,
    "tyres" DOUBLE PRECISION DEFAULT 0,
    "rentAmount" DOUBLE PRECISION,
    "paymentMode" "PaymentMode",
    "totalExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "ownership" "VehicleOwnership" NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "yearOfManufacture" INTEGER,
    "fuelType" "FuelType",
    "engineNumber" TEXT,
    "chassisNumber" TEXT,
    "capacityInTons" DOUBLE PRECISION,
    "bodyType" TEXT,
    "rcValidity" TIMESTAMP(3),
    "insuranceExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "pollutionExpiry" TIMESTAMP(3),
    "permitExpiry" TIMESTAMP(3),
    "roadTaxExpiry" TIMESTAMP(3),
    "assignedDriverId" TEXT,
    "rentalAgency" TEXT,
    "rentalRatePerDay" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "aadharNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingAmount" (
    "id" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "workers" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "PackingAmount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "count" INTEGER NOT NULL DEFAULT 0,
    "packingCount" INTEGER NOT NULL DEFAULT 0,
    "packingYear" INTEGER,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'RS-Fisheries-',
    "partyName" TEXT,
    "partyAddress" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hsnCode" TEXT,
    "billTo" TEXT,
    "shipTo" TEXT,
    "pan" TEXT,
    "bankDetails" TEXT,
    "taxInWords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoice" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "hsn" TEXT NOT NULL,
    "gstPercent" DOUBLE PRECISION NOT NULL,
    "taxableValue" DOUBLE PRECISION NOT NULL,
    "gstAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "billTo" TEXT NOT NULL,
    "shipTo" TEXT NOT NULL,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FishVariety_code_key" ON "FishVariety"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FormerLoading_billNo_key" ON "FormerLoading"("billNo");

-- CreateIndex
CREATE INDEX "FormerItem_formerLoadingId_idx" ON "FormerItem"("formerLoadingId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentLoading_billNo_key" ON "AgentLoading"("billNo");

-- CreateIndex
CREATE INDEX "AgentItem_agentLoadingId_idx" ON "AgentItem"("agentLoadingId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientLoading_billNo_key" ON "ClientLoading"("billNo");

-- CreateIndex
CREATE INDEX "ClientItem_clientLoadingId_idx" ON "ClientItem"("clientLoadingId");

-- CreateIndex
CREATE INDEX "VendorPayment_vendorId_idx" ON "VendorPayment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPayment_source_idx" ON "VendorPayment"("source");

-- CreateIndex
CREATE INDEX "ClientPayment_clientId_idx" ON "ClientPayment"("clientId");

-- CreateIndex
CREATE INDEX "ClientPayment_date_idx" ON "ClientPayment"("date");

-- CreateIndex
CREATE INDEX "VehicleEntry_vehicleId_idx" ON "VehicleEntry"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicleNumber_key" ON "Vehicle"("vehicleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_engineNumber_key" ON "Vehicle"("engineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_chassisNumber_key" ON "Vehicle"("chassisNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_assignedDriverId_key" ON "Vehicle"("assignedDriverId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_phone_key" ON "Driver"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_licenseNumber_key" ON "Driver"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_aadharNumber_key" ON "Driver"("aadharNumber");

-- CreateIndex
CREATE INDEX "EmployeePayment_userId_idx" ON "EmployeePayment"("userId");

-- CreateIndex
CREATE INDEX "EmployeePayment_date_idx" ON "EmployeePayment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PackingAmount_billNo_key" ON "PackingAmount"("billNo");

-- CreateIndex
CREATE INDEX "PackingAmount_mode_idx" ON "PackingAmount"("mode");

-- CreateIndex
CREATE INDEX "PackingAmount_createdAt_idx" ON "PackingAmount"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvoice_paymentId_key" ON "VendorInvoice"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvoice_invoiceNo_key" ON "VendorInvoice"("invoiceNo");

-- AddForeignKey
ALTER TABLE "FormerLoading" ADD CONSTRAINT "FormerLoading_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormerItem" ADD CONSTRAINT "FormerItem_formerLoadingId_fkey" FOREIGN KEY ("formerLoadingId") REFERENCES "FormerLoading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLoading" ADD CONSTRAINT "AgentLoading_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentItem" ADD CONSTRAINT "AgentItem_agentLoadingId_fkey" FOREIGN KEY ("agentLoadingId") REFERENCES "AgentLoading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLoading" ADD CONSTRAINT "ClientLoading_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientItem" ADD CONSTRAINT "ClientItem_clientLoadingId_fkey" FOREIGN KEY ("clientLoadingId") REFERENCES "ClientLoading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salaries" ADD CONSTRAINT "Salaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientLoading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleEntry" ADD CONSTRAINT "VehicleEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayment" ADD CONSTRAINT "EmployeePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingAmount" ADD CONSTRAINT "PackingAmount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "VendorPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
