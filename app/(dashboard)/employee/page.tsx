"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { generateJoiningFormPDF } from "./components/generateJoiningFormPDF";

export default function EmployeePage() {
  return (
    <section>
      <Button onClick={generateJoiningFormPDF}>Download Joining Form</Button>
    </section>
  );
}
