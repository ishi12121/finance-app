"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { FaPiggyBank } from "react-icons/fa";
import { FaArrowTrendUp, FaArrowTrendDown } from "react-icons/fa6";

import { useGetSummary } from "@/features/summary/api/use-get-summary";
import { formatDateRange } from "@/lib/utils";
import { DataCard, DataCardLoading } from "./data-card";
import { subDays } from "date-fns";

export const DataGrid = () => {
  const { data, isLoading } = useGetSummary();
  const searchParams = useSearchParams();
  const to = searchParams.get("to") || undefined;
  const from = searchParams.get("from") || undefined;
  const navigate = useRouter();
  const dateRangeLabel = formatDateRange({ to, from });

  if (isLoading)
    return (
      <div className="mb-8 grid grid-cols-1 gap-8 pb-2 lg:grid-cols-3">
        <DataCardLoading />
        <DataCardLoading />
        <DataCardLoading />
      </div>
    );

  return (
    <div className="mb-8 grid grid-cols-1 gap-8 pb-2 lg:grid-cols-3">
      <DataCard
        title="Remaining"
        value={data?.remainingAmount}
        percentageChange={data?.remainingChange}
        icon={FaPiggyBank}
        variant="default"
        dateRange={dateRangeLabel}
      />

      <DataCard
        title="Income"
        value={data?.incomeAmount}
        percentageChange={data?.incomeChange}
        icon={FaArrowTrendUp}
        variant="success"
        dateRange={dateRangeLabel}
        onClick={() =>
          navigate.push(
            `/transactions?from=${subDays(new Date(), 30).toISOString().split("T")[0]}&to=${new Date().toISOString().split("T")[0]}&type=Income`
          )
        }
      />

      <DataCard
        title="Expenses"
        value={data?.expensesAmount}
        percentageChange={data?.expensesChange}
        icon={FaArrowTrendDown}
        variant="danger"
        dateRange={dateRangeLabel}
        onClick={() =>
          navigate.push(
            `/transactions?from=${subDays(new Date(), 30).toISOString().split("T")[0]}&to=${new Date().toISOString().split("T")[0]}&type=Expenses`
          )
        }
      />
    </div>
  );
};
