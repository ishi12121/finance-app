import type { PropsWithChildren } from "react";

import { Header } from "@/components/header";
import { ChatApp } from "@/components/chat-app";

const DashboardLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <Header />
      <main className="px-3 lg:px-14">{children}</main>
      <ChatApp />
    </>
  );
};

export default DashboardLayout;
