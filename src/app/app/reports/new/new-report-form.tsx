"use client";

import { useActionState } from "react";
import { Camera } from "lucide-react";
import { createReportAction } from "../actions";
import { ReportFields, type CustomerOpt, type ReportValues, type SiteOpt } from "../report-fields";
import { FormMessage, SubmitButton } from "@/components/form";

export function NewReportForm({ customers, sites, values }: { customers: CustomerOpt[]; sites: SiteOpt[]; values: ReportValues }) {
  const [state, action] = useActionState(createReportAction, {});
  const v = state.values ? { ...values, ...state.values } : values;
  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />
      <ReportFields values={v} customers={customers} sites={sites} errors={state.fieldErrors} part="basic" />
      <SubmitButton size="lg" className="w-full" pendingText="作成しています…">
        <Camera className="size-5" aria-hidden />
        作成して写真を撮る
      </SubmitButton>
    </form>
  );
}
