"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetTransactions } from "@/features/transactions/api/use-get-transactions";
import { useEffect } from "react";

export const ExpenseTypeFilter = () => {
  const { refetch } = useGetTransactions();

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId") || "";
  const type = searchParams.get("type") || undefined;
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const onChange = (newType: string) => {
    const query = {
      accountId,
      from,
      to,
      type: newType === "all" ? undefined : newType,
    };
    const url = qs.stringifyUrl(
      {
        url: pathname,
        query,
      },
      { skipNull: true, skipEmptyString: true }
    );
    router.push(url);
    refetch();
  };

  const formData = [
    { key: 1, value: "Expenses" },
    { key: 2, value: "Income" },
  ];
  useEffect(() => {
    refetch();
  }, [accountId, type, from, to, refetch]);
  return (
    <Select value={type} onValueChange={onChange} disabled={pathname === "/"}>
      <SelectTrigger className="h-9 w-full rounded-md border-none bg-white/10 px-3 font-normal text-white outline-none transition hover:bg-white/30 hover:text-white focus:bg-white/30 focus:ring-transparent focus:ring-offset-0 lg:w-auto">
        <SelectValue placeholder="Select Expense" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">None</SelectItem>
        {formData?.map((formData) => (
          <SelectItem key={formData.key} value={formData.value}>
            {formData.value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
