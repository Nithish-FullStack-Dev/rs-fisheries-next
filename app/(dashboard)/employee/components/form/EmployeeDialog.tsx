"use client";

import React from "react";
import { useForm } from "react-hook-form";

const EmployeeDialog = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  return (
    <div>
      <form action=""></form>
    </div>
  );
};

export default EmployeeDialog;
